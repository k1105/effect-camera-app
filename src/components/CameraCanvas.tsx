import {useEffect, useRef, useState} from "react";
import aspLogo from "../assets/asp-logo.png";
import {
  calculateEffectRenderData,
  // calculateEffectTransform,
  // getBlendModeValue,
  type BlendMode,
} from "../utils/effectRenderer";
import {badTVVertexShader, badTVFragmentShader} from "../utils/badTVShader";
import {getBadTVConfigForEffect} from "../utils/badTVConfig";
import {
  psychedelicVertexShader,
  psychedelicFragmentShader,
} from "../utils/psychedelicShader";
import {getPsychedelicConfigForEffect} from "../utils/psychedelicConfig";
import {mobileVertexShader, mobileFragmentShader} from "../utils/mobileShader";
import {getMobileConfigForEffect} from "../utils/mobileConfig";
import {shouldDisableShaders} from "../utils/deviceDetection";

interface CameraCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  bitmaps: ImageBitmap[];
  current: number;
  ready: boolean;
  isPreviewMode: boolean;
  blendMode?: BlendMode;
  isSwitchingCamera?: boolean;
  isNoSignalDetected?: boolean;
}

// WebGLシェーダーソース
const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  
  uniform mat3 u_transform;
  
  varying vec2 v_texCoord;
  
  void main() {
    vec2 position = (u_transform * vec3(a_position, 1.0)).xy;
    gl_Position = vec4(position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_alpha;
  
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    gl_FragColor = vec4(color.rgb, color.a * u_alpha);
  }
`;

// ブレンドモード用フラグメントシェーダー
const blendFragmentShaderSource = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform sampler2D u_background;
  uniform float u_alpha;
  uniform int u_blendMode;
  
  varying vec2 v_texCoord;
  
  vec3 blend(vec3 base, vec3 blend, int mode) {
    if (mode == 0) return blend; // source-over
    if (mode == 1) return base * blend; // multiply
    if (mode == 2) return 1.0 - (1.0 - base) * (1.0 - blend); // screen
    if (mode == 3) { // overlay
      return vec3(
        base.r < 0.5 ? 2.0 * base.r * blend.r : 1.0 - 2.0 * (1.0 - base.r) * (1.0 - blend.r),
        base.g < 0.5 ? 2.0 * base.g * blend.g : 1.0 - 2.0 * (1.0 - base.g) * (1.0 - blend.g),
        base.b < 0.5 ? 2.0 * base.b * blend.b : 1.0 - 2.0 * (1.0 - base.b) * (1.0 - blend.b)
      );
    }
    if (mode == 4) { // soft-light
      return vec3(
        blend.r < 0.5 ? 2.0 * base.r * blend.r + base.r * base.r * (1.0 - 2.0 * blend.r) : sqrt(base.r) * (2.0 * blend.r - 1.0) + 2.0 * base.r * (1.0 - blend.r),
        blend.g < 0.5 ? 2.0 * base.g * blend.g + base.g * base.g * (1.0 - 2.0 * blend.g) : sqrt(base.g) * (2.0 * blend.g - 1.0) + 2.0 * base.g * (1.0 - blend.g),
        blend.b < 0.5 ? 2.0 * base.b * blend.b + base.b * base.b * (1.0 - 2.0 * blend.b) : sqrt(base.b) * (2.0 * blend.b - 1.0) + 2.0 * base.b * (1.0 - blend.b)
      );
    }
    if (mode == 5) { // hard-light
      return vec3(
        blend.r < 0.5 ? 2.0 * base.r * blend.r : 1.0 - 2.0 * (1.0 - base.r) * (1.0 - blend.r),
        blend.g < 0.5 ? 2.0 * base.g * blend.g : 1.0 - 2.0 * (1.0 - base.g) * (1.0 - blend.g),
        blend.b < 0.5 ? 2.0 * base.b * blend.b : 1.0 - 2.0 * (1.0 - base.b) * (1.0 - blend.b)
      );
    }
    return blend;
  }
  
  void main() {
    vec4 textureColor = texture2D(u_texture, v_texCoord);
    vec4 bgColor = texture2D(u_background, v_texCoord);
    
    vec3 blended = blend(bgColor.rgb, textureColor.rgb, u_blendMode);
    gl_FragColor = vec4(blended, textureColor.a * u_alpha);
  }
`;

// エフェクト名の取得
const getEffectName = (effectId: number): string => {
  const effectNames = [
    "Bad TV - Subtle",
    "Bad TV - Moderate",
    "Bad TV - Heavy",
    "Bad TV - Extreme",
    "Psychedelic - Subtle",
    "Psychedelic - Moderate",
    "Psychedelic - Intense",
    "Psychedelic - Extreme",
  ];
  return effectNames[effectId] || `Effect ${effectId}`;
};

export const CameraCanvas: React.FC<CameraCanvasProps> = ({
  videoRef,
  bitmaps,
  current,
  ready,
  isPreviewMode,
  blendMode = "source-over",
  isSwitchingCamera = false,
  isNoSignalDetected = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const blendProgramRef = useRef<WebGLProgram | null>(null);
  const badTVProgramRef = useRef<WebGLProgram | null>(null);
  const psychedelicProgramRef = useRef<WebGLProgram | null>(null);
  const mobileProgramRef = useRef<WebGLProgram | null>(null);
  const [aspLogoBitmap, setAspLogoBitmap] = useState<ImageBitmap | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  const [showEffectText, setShowEffectText] = useState(false);
  const [effectTextOpacity, setEffectTextOpacity] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // モバイルデバイス検出
  useEffect(() => {
    setIsMobile(shouldDisableShaders());
  }, []);

  // エフェクト切り替え時のテキスト表示
  useEffect(() => {
    if (ready && !isPreviewMode) {
      setShowEffectText(true);
      setEffectTextOpacity(1.0);

      // 2秒後にフェードアウト
      const fadeOutTimer = setTimeout(() => {
        setEffectTextOpacity(0);
        setTimeout(() => setShowEffectText(false), 500);
      }, 2000);

      return () => clearTimeout(fadeOutTimer);
    }
  }, [current, ready, isPreviewMode]);

  // WebGL初期化
  const initWebGL = () => {
    try {
      const canvas = canvasRef.current!;
      const gl = (canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")) as WebGLRenderingContext;

      if (!gl) {
        console.error("WebGL not supported");
        return false;
      }

      glRef.current = gl;

      // シェーダーの作成
      const vertexShader = createShader(
        gl,
        gl.VERTEX_SHADER,
        vertexShaderSource
      );
      const fragmentShader = createShader(
        gl,
        gl.FRAGMENT_SHADER,
        fragmentShaderSource
      );
      const blendFragmentShader = createShader(
        gl,
        gl.FRAGMENT_SHADER,
        blendFragmentShaderSource
      );
      const badTVVertexShaderObj = createShader(
        gl,
        gl.VERTEX_SHADER,
        badTVVertexShader
      );
      const badTVFragmentShaderObj = createShader(
        gl,
        gl.FRAGMENT_SHADER,
        badTVFragmentShader
      );
      const psychedelicVertexShaderObj = createShader(
        gl,
        gl.VERTEX_SHADER,
        psychedelicVertexShader
      );
      const psychedelicFragmentShaderObj = createShader(
        gl,
        gl.FRAGMENT_SHADER,
        psychedelicFragmentShader
      );
      const mobileVertexShaderObj = createShader(
        gl,
        gl.VERTEX_SHADER,
        mobileVertexShader
      );
      const mobileFragmentShaderObj = createShader(
        gl,
        gl.FRAGMENT_SHADER,
        mobileFragmentShader
      );

      if (
        !vertexShader ||
        !fragmentShader ||
        !blendFragmentShader ||
        !badTVVertexShaderObj ||
        !badTVFragmentShaderObj ||
        !psychedelicVertexShaderObj ||
        !psychedelicFragmentShaderObj ||
        !mobileVertexShaderObj ||
        !mobileFragmentShaderObj
      ) {
        console.error("Shader creation failed");
        return false;
      }

      // プログラムの作成
      programRef.current = createProgram(gl, vertexShader, fragmentShader);
      blendProgramRef.current = createProgram(
        gl,
        vertexShader,
        blendFragmentShader
      );
      badTVProgramRef.current = createProgram(
        gl,
        badTVVertexShaderObj,
        badTVFragmentShaderObj
      );
      psychedelicProgramRef.current = createProgram(
        gl,
        psychedelicVertexShaderObj,
        psychedelicFragmentShaderObj
      );
      mobileProgramRef.current = createProgram(
        gl,
        mobileVertexShaderObj,
        mobileFragmentShaderObj
      );

      if (
        !programRef.current ||
        !blendProgramRef.current ||
        !badTVProgramRef.current ||
        !psychedelicProgramRef.current ||
        !mobileProgramRef.current
      ) {
        console.error("Program creation failed");
        return false;
      }

      // ブレンドモードの設定
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      console.log("WebGL initialized successfully");
      return true;
    } catch (error) {
      console.error("WebGL initialization error:", error);
      return false;
    }
  };

  // シェーダーの作成
  const createShader = (
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ) => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  // プログラムの作成
  const createProgram = (
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ) => {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  };

  // テクスチャの作成（メモリ最適化版）
  const createTexture = (
    gl: WebGLRenderingContext,
    image: HTMLVideoElement | ImageBitmap
  ) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // モバイルデバイス用の最適化
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // テクスチャデータの設定
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    return texture;
  };

  // 四角形の描画
  const drawQuad = (
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    transform: number[],
    texture: WebGLTexture,
    alpha: number = 1.0
  ) => {
    gl.useProgram(program);

    // 頂点データ
    const positions = new Float32Array([
      -1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

    gl.enableVertexAttribArray(positionLocation);
    gl.enableVertexAttribArray(texCoordLocation);

    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

    // ユニフォームの設定
    const transformLocation = gl.getUniformLocation(program, "u_transform");
    gl.uniformMatrix3fv(transformLocation, false, new Float32Array(transform));

    const textureLocation = gl.getUniformLocation(program, "u_texture");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(textureLocation, 0);

    const alphaLocation = gl.getUniformLocation(program, "u_alpha");
    gl.uniform1f(alphaLocation, alpha);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // ロゴ画像のプリロード
  useEffect(() => {
    const preloadLogoImages = async () => {
      try {
        const bitmap = await createImageBitmap(
          await fetch(aspLogo).then((r) => r.blob())
        );
        setAspLogoBitmap(bitmap);
      } catch (error) {
        console.error("ロゴ画像の読み込みに失敗しました:", error);
      }
    };

    preloadLogoImages();
  }, []);

  // エフェクトが検出された時のオーバーレイフェードアウト
  useEffect(() => {
    if (!isNoSignalDetected && overlayOpacity > 0) {
      const fadeOutDuration = 500;
      const fadeOutSteps = 20;
      const opacityStep = overlayOpacity / fadeOutSteps;
      const stepDuration = fadeOutDuration / fadeOutSteps;

      const fadeOutInterval = setInterval(() => {
        setOverlayOpacity((prev) => {
          const newOpacity = prev - opacityStep;
          if (newOpacity <= 0) {
            clearInterval(fadeOutInterval);
            return 0;
          }
          return newOpacity;
        });
      }, stepDuration);

      return () => clearInterval(fadeOutInterval);
    } else if (isNoSignalDetected && overlayOpacity < 0.8) {
      setOverlayOpacity(0.8);
    }
  }, [isNoSignalDetected, overlayOpacity]);

  useEffect(() => {
    if (!ready || isPreviewMode) return;

    const canvas = canvasRef.current!;

    // WebGL初期化
    if (!glRef.current) {
      if (!initWebGL()) return;
    }

    const gl = glRef.current!;
    const program = programRef.current!;
    const blendProgram = blendProgramRef.current!;
    const badTVProgram = badTVProgramRef.current!;
    const psychedelicProgram = psychedelicProgramRef.current!;
    const mobileProgram = mobileProgramRef.current!;

    if (
      !gl ||
      !program ||
      !blendProgram ||
      !badTVProgram ||
      !psychedelicProgram ||
      !mobileProgram
    ) {
      console.error("WebGL initialization failed");
      return;
    }

    // canvasの解像度設定（固定解像度）
    const targetWidth = 1080;
    const targetHeight = 1920;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    gl.viewport(0, 0, targetWidth, targetHeight);

    let raf = 0;
    let lastDrawTime = 0;
    const targetFPS = 30; // モバイル用に30fpsに制限
    const frameInterval = 1000 / targetFPS;

    // モバイルデバイスの場合は軽量シェーダーを使用
    if (isMobile) {
      console.log("Mobile device detected - using lightweight shader");

      // モバイル用の軽量描画ループ
      const mobileDraw = (currentTime: number) => {
        try {
          const vid = videoRef.current!;
          if (!vid.videoWidth || !vid.videoHeight) {
            raf = requestAnimationFrame(mobileDraw);
            return;
          }

          // 背景をクリア
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);

          // カメラ映像のテクスチャを作成
          const videoTexture = createTexture(gl, vid);

          // モバイルシェーダーでカメラ映像を描画
          gl.useProgram(mobileProgram);

          // エフェクトIDに基づいてモバイル設定を取得
          const mobileConfig = getMobileConfigForEffect(current);

          // モバイルシェーダーのユニフォームを設定
          const timeLocation = gl.getUniformLocation(mobileProgram, "u_time");
          const brightnessLocation = gl.getUniformLocation(
            mobileProgram,
            "u_brightness"
          );
          const contrastLocation = gl.getUniformLocation(
            mobileProgram,
            "u_contrast"
          );
          const saturationLocation = gl.getUniformLocation(
            mobileProgram,
            "u_saturation"
          );
          const tintLocation = gl.getUniformLocation(mobileProgram, "u_tint");

          gl.uniform1f(timeLocation, currentTime * 0.001);
          gl.uniform1f(brightnessLocation, mobileConfig.brightness);
          gl.uniform1f(contrastLocation, mobileConfig.contrast);
          gl.uniform1f(saturationLocation, mobileConfig.saturation);
          gl.uniform1f(tintLocation, mobileConfig.tint);

          const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
          drawQuad(gl, mobileProgram, identity, videoTexture);

          // モバイル用テクスチャを解放
          gl.deleteTexture(videoTexture);

          raf = requestAnimationFrame(mobileDraw);
        } catch (error) {
          console.error("Mobile WebGL rendering error:", error);
          raf = requestAnimationFrame(mobileDraw);
        }
      };

      raf = requestAnimationFrame(mobileDraw);
      return () => cancelAnimationFrame(raf);
    }

    const draw = (currentTime: number) => {
      try {
        // フレームレート制限
        if (currentTime - lastDrawTime < frameInterval) {
          raf = requestAnimationFrame(draw);
          return;
        }
        lastDrawTime = currentTime;

        const vid = videoRef.current!;
        if (!vid.videoWidth || !vid.videoHeight) {
          raf = requestAnimationFrame(draw);
          return;
        }

        // 背景をクリア
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // カメラ映像のテクスチャを作成
        const videoTexture = createTexture(gl, vid);

        // エフェクトの描画データを取得
        const effectRenderData = calculateEffectRenderData({
          current,
          bitmaps,
          isSwitchingCamera,
          blendMode,
          canvasWidth: targetWidth,
          canvasHeight: targetHeight,
          currentTime,
        });

        // カメラ映像を先に描画（effect0の場合はBad TV Shaderを使用）
        const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];

        if (effectRenderData.effectType === "badTV") {
          // Bad TV Shaderでカメラ映像を描画
          gl.useProgram(badTVProgramRef.current!);

          // エフェクトIDに基づいてBad TV設定を取得
          const badTVConfig = getBadTVConfigForEffect(current);

          // Bad TV Shaderのユニフォームを設定
          const timeLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_time"
          );
          const distortionLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_distortion"
          );
          const distortion2Location = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_distortion2"
          );
          const speedLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_speed"
          );
          const rollSpeedLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_rollSpeed"
          );
          const chromaticAberrationLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_chromaticAberration"
          );
          const interlaceIntensityLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_interlaceIntensity"
          );
          const interlaceLineWidthLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_interlaceLineWidth"
          );

          gl.uniform1f(timeLocation, currentTime * 0.001);
          gl.uniform1f(distortionLocation, badTVConfig.distortion);
          gl.uniform1f(distortion2Location, badTVConfig.distortion2);
          gl.uniform1f(speedLocation, badTVConfig.speed);
          gl.uniform1f(rollSpeedLocation, badTVConfig.rollSpeed);
          gl.uniform1f(
            chromaticAberrationLocation,
            badTVConfig.chromaticAberration
          );
          gl.uniform1f(
            interlaceIntensityLocation,
            badTVConfig.interlaceIntensity
          );
          gl.uniform1f(
            interlaceLineWidthLocation,
            badTVConfig.interlaceLineWidth
          );

          drawQuad(gl, badTVProgramRef.current!, identity, videoTexture);
        } else if (effectRenderData.effectType === "psychedelic") {
          // サイケデリックシェーダーでカメラ映像を描画
          gl.useProgram(psychedelicProgramRef.current!);

          // エフェクトIDに基づいてサイケデリック設定を取得
          const psychedelicConfig = getPsychedelicConfigForEffect(current);

          // サイケデリックシェーダーのユニフォームを設定
          const timeLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_time"
          );
          const thermalIntensityLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_thermalIntensity"
          );
          const contrastIntensityLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_contrastIntensity"
          );
          const psychedelicSpeedLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_psychedelicSpeed"
          );
          const channelShiftLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_channelShift"
          );
          const glowIntensityLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_glowIntensity"
          );

          gl.uniform1f(timeLocation, currentTime * 0.001);
          gl.uniform1f(
            thermalIntensityLocation,
            psychedelicConfig.thermalIntensity
          );
          gl.uniform1f(
            contrastIntensityLocation,
            psychedelicConfig.contrastIntensity
          );
          gl.uniform1f(
            psychedelicSpeedLocation,
            psychedelicConfig.psychedelicSpeed
          );
          gl.uniform1f(channelShiftLocation, psychedelicConfig.channelShift);
          gl.uniform1f(glowIntensityLocation, psychedelicConfig.glowIntensity);

          drawQuad(gl, psychedelicProgramRef.current!, identity, videoTexture);
        } else {
          // 通常のシェーダーでカメラ映像を描画
          drawQuad(gl, program, identity, videoTexture);
        }

        // エフェクトの描画（カメラ映像の上に重ねる）
        // if (
        //   effectRenderData.effectBitmap &&
        //   effectRenderData.positions.length > 0
        // ) {
        //   const effectTexture = createTexture(
        //     gl,
        //     effectRenderData.effectBitmap
        //   );

        //   for (const pos of effectRenderData.positions) {
        //     const {transform} = calculateEffectTransform(
        //       pos,
        //       effectRenderData.effectBitmap,
        //       targetWidth,
        //       targetHeight
        //     );

        //     // 通常のブレンドモードを使用
        //     const blendModeValue = getBlendModeValue(blendMode);
        //     gl.useProgram(blendProgram);

        //     const blendModeLocation = gl.getUniformLocation(
        //       blendProgram,
        //       "u_blendMode"
        //     );
        //     gl.uniform1i(blendModeLocation, blendModeValue);

        //     // 背景テクスチャの設定（カメラ映像の代わりに現在のフレームバッファを使用）
        //     const backgroundLocation = gl.getUniformLocation(
        //       blendProgram,
        //       "u_background"
        //     );
        //     gl.activeTexture(gl.TEXTURE1);
        //     gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        //     gl.uniform1i(backgroundLocation, 1);

        //     drawQuad(gl, blendProgram, transform, effectTexture);
        //   }
        //   // エフェクトテクスチャを解放
        //   gl.deleteTexture(effectTexture);
        // }

        // カメラ映像テクスチャを解放（描画完了後）
        gl.deleteTexture(videoTexture);

        // ロゴの描画
        if (isNoSignalDetected && aspLogoBitmap) {
          const logoTexture = createTexture(gl, aspLogoBitmap);
          const logoSize = 300; // 固定サイズ
          const logoX = (targetWidth - logoSize) / 2;
          const logoY = (targetHeight - logoSize) / 2;

          const scaleX = logoSize / targetWidth;
          const scaleY = logoSize / targetHeight;
          const translateX = (logoX - targetWidth / 2) / (targetWidth / 2);
          const translateY = (logoY - targetHeight / 2) / (targetHeight / 2);

          const logoTransform = [
            scaleX,
            0,
            translateX,
            0,
            scaleY,
            translateY,
            0,
            0,
            1,
          ];

          drawQuad(gl, program, logoTransform, logoTexture);
          // ロゴテクスチャを解放
          gl.deleteTexture(logoTexture);
        }

        raf = requestAnimationFrame(draw);
      } catch (error) {
        console.error("WebGL rendering error:", error);
        // エラーが発生しても描画ループを継続
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    ready,
    current,
    bitmaps,
    isPreviewMode,
    videoRef,
    blendMode,
    isSwitchingCamera,
    isNoSignalDetected,
    aspLogoBitmap,
  ]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />

      {/* 黒いオーバーレイレイヤー */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "black",
          opacity: overlayOpacity,
          pointerEvents: "none",
          zIndex: 1,
          transition: "opacity 0.1s ease-out",
        }}
      />
      {/* エフェクト名表示 */}
      {showEffectText && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "48px",
            fontWeight: "bold",
            textAlign: "center",
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
            pointerEvents: "none",
            zIndex: 10,
            opacity: effectTextOpacity,
            transition: "opacity 0.5s ease-in-out",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: "20px 40px",
            borderRadius: "10px",
            border: "2px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          {getEffectName(current)}
        </div>
      )}
    </>
  );
};
