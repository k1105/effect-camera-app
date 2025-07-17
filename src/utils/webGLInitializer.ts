import {createShader, createProgram} from "./webglUtils";
import {
  vertexShaderSource,
  fragmentShaderSource,
  blendFragmentShaderSource,
  staticVertexShader,
  staticFragmentShader,
} from "./shaderSources";
import {badTVVertexShader, badTVFragmentShader} from "./badTVShader";
import {
  psychedelicVertexShader,
  psychedelicFragmentShader,
} from "./psychedelicShader";

export interface WebGLPrograms {
  program: WebGLProgram | null;
  blendProgram: WebGLProgram | null;
  badTVProgram: WebGLProgram | null;
  psychedelicProgram: WebGLProgram | null;
  staticProgram: WebGLProgram | null;
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
          staticProgram: null,
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
    const staticVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      staticVertexShader
    );
    const staticFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      staticFragmentShader
    );

    if (
      !vertexShader ||
      !fragmentShader ||
      !blendFragmentShader ||
      !badTVVertexShaderObj ||
      !badTVFragmentShaderObj ||
      !psychedelicVertexShaderObj ||
      !psychedelicFragmentShaderObj ||
      !staticVertexShaderObj ||
      !staticFragmentShaderObj
    ) {
      console.error("Shader creation failed");
      return {
        gl: null,
        programs: {
          program: null,
          blendProgram: null,
          badTVProgram: null,
          psychedelicProgram: null,
          staticProgram: null,
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
    const staticProgram = createProgram(
      gl,
      staticVertexShaderObj,
      staticFragmentShaderObj
    );

    if (
      !program ||
      !blendProgram ||
      !badTVProgram ||
      !psychedelicProgram ||
      !staticProgram
    ) {
      console.error("Program creation failed");
      return {
        gl: null,
        programs: {
          program: null,
          blendProgram: null,
          badTVProgram: null,
          psychedelicProgram: null,
          staticProgram: null,
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
        staticProgram,
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
        staticProgram: null,
      },
    };
  }
};
