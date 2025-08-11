// WebGLユーティリティ関数

// シェーダーの作成
export const createShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null => {
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
export const createProgram = (
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null => {
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
export const createTexture = (
  gl: WebGLRenderingContext,
  image: HTMLVideoElement | ImageBitmap
): WebGLTexture => {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Failed to create WebGL texture");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // テクスチャデータの設定
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  return texture;
};

// キャンバスからテクスチャを作成（Static Shader用）
export const createTextureFromCanvas = (
  gl: WebGLRenderingContext,
  canvas: HTMLCanvasElement
): WebGLTexture => {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Failed to create WebGL texture");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);

  // モバイルデバイス用の最適化
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // キャンバスからテクスチャデータを設定
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

  return texture;
};

// 四角形の描画
export const drawQuad = (
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  transform: number[],
  texture: WebGLTexture,
  alpha: number = 1.0
): void => {
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
