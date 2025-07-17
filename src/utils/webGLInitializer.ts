import {createShader, createProgram} from "./webglUtils";
import {
  vertexShaderSource,
  fragmentShaderSource,
  blendFragmentShaderSource,
} from "./shaderSources";
import {badTVVertexShader, badTVFragmentShader} from "./badTVShader";
import {
  psychedelicVertexShader,
  psychedelicFragmentShader,
} from "./psychedelicShader";
import {mobileVertexShader, mobileFragmentShader} from "./mobileShader";

export interface WebGLPrograms {
  program: WebGLProgram | null;
  blendProgram: WebGLProgram | null;
  badTVProgram: WebGLProgram | null;
  psychedelicProgram: WebGLProgram | null;
  mobileProgram: WebGLProgram | null;
}

// WebGL初期化
export const initWebGL = (
  canvas: HTMLCanvasElement
): {gl: WebGLRenderingContext | null; programs: WebGLPrograms} => {
  try {
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext;

    if (!gl) {
      console.error("WebGL not supported");
      return {
        gl: null,
        programs: {
          program: null,
          blendProgram: null,
          badTVProgram: null,
          psychedelicProgram: null,
          mobileProgram: null,
        },
      };
    }

    // シェーダーの作成
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
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
      return {
        gl: null,
        programs: {
          program: null,
          blendProgram: null,
          badTVProgram: null,
          psychedelicProgram: null,
          mobileProgram: null,
        },
      };
    }

    // プログラムの作成
    const program = createProgram(gl, vertexShader, fragmentShader);
    const blendProgram = createProgram(gl, vertexShader, blendFragmentShader);
    const badTVProgram = createProgram(
      gl,
      badTVVertexShaderObj,
      badTVFragmentShaderObj
    );
    const psychedelicProgram = createProgram(
      gl,
      psychedelicVertexShaderObj,
      psychedelicFragmentShaderObj
    );
    const mobileProgram = createProgram(
      gl,
      mobileVertexShaderObj,
      mobileFragmentShaderObj
    );

    if (
      !program ||
      !blendProgram ||
      !badTVProgram ||
      !psychedelicProgram ||
      !mobileProgram
    ) {
      console.error("Program creation failed");
      return {
        gl: null,
        programs: {
          program: null,
          blendProgram: null,
          badTVProgram: null,
          psychedelicProgram: null,
          mobileProgram: null,
        },
      };
    }

    // ブレンドモードの設定
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    console.log("WebGL initialized successfully");
    return {
      gl,
      programs: {
        program,
        blendProgram,
        badTVProgram,
        psychedelicProgram,
        mobileProgram,
      },
    };
  } catch (error) {
    console.error("WebGL initialization error:", error);
    return {
      gl: null,
      programs: {
        program: null,
        blendProgram: null,
        badTVProgram: null,
        psychedelicProgram: null,
        mobileProgram: null,
      },
    };
  }
};
