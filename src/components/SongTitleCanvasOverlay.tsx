import {useEffect, useRef, useState} from "react";

interface SongTitleCanvasOverlayProps {
  songId: number;
  isVisible: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gl: WebGLRenderingContext | null;
}

const SONG_TITLES = [
  "anyway",
  "black_nails", 
  "blueberry_gum",
  "darma",
  "gtoer_cracker",
  "heavens_seven",
  "I-hate-u",
  "I-wont-let-you-go",
  "make_a_move",
  "no_colors",
  "please",
  "sexual_conversation",
  "tokyo_sky_blues",
  "too_young_to_get_it_too_fast_to_live",
  "totsugeki",
  "toxic_invasion"
];

export const SongTitleCanvasOverlay: React.FC<SongTitleCanvasOverlayProps> = ({
  songId,
  isVisible,
  canvasRef,
  gl
}) => {
  const [showImage, setShowImage] = useState(false);
  const [imageTexture, setImageTexture] = useState<WebGLTexture | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const animationRef = useRef<number | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);

  // Load image texture
  useEffect(() => {
    if (!isVisible || songId < 0 || songId >= SONG_TITLES.length || !gl) {
      setImageLoaded(false);
      return;
    }

    const imageName = SONG_TITLES[songId];
    const imagePath = `/assets/song_title/${imageName}.png`;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      if (!gl) return;
      
      // Create texture
      const texture = gl.createTexture();
      if (!texture) return;
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      
      setImageTexture(texture);
      setImageLoaded(true);
    };
    
    img.onerror = () => {
      console.error(`Failed to load image: ${imagePath}`);
      setImageLoaded(false);
    };
    
    img.src = imagePath;
    
    return () => {
      if (imageTexture && gl) {
        gl.deleteTexture(imageTexture);
      }
    };
  }, [songId, isVisible, gl]);

  // Animation cycle
  useEffect(() => {
    if (!isVisible || !imageLoaded) {
      setShowImage(false);
      return;
    }

    const cycle = () => {
      // Show image for 1 second
      setShowImage(true);
      
      setTimeout(() => {
        // Hide image for 4 seconds
        setShowImage(false);
      }, 1000);
    };

    // Start the cycle immediately
    cycle();

    // Set up the repeating cycle (5 seconds total: 1s show + 4s hide)
    const interval = setInterval(cycle, 5000);

    return () => {
      clearInterval(interval);
      setShowImage(false);
    };
  }, [isVisible, imageLoaded]);

  // Create WebGL program and buffers once
  useEffect(() => {
    if (!gl) return;

    // Create shaders
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_texture;
      varying vec2 v_texCoord;
      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord);
      }
    `;
    
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    
    if (!vertexShader || !fragmentShader) return;
    
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);
    
    // Create program
    const program = gl.createProgram();
    if (!program) return;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    
    // Create position buffer
    const positions = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
       1,  1, 1, 0,
    ]);
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    programRef.current = program;
    positionBufferRef.current = positionBuffer;
    
    // Cleanup shaders (program keeps references)
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    
    return () => {
      if (programRef.current) {
        gl.deleteProgram(programRef.current);
        programRef.current = null;
      }
      if (positionBufferRef.current) {
        gl.deleteBuffer(positionBufferRef.current);
        positionBufferRef.current = null;
      }
    };
  }, [gl]);

  // Render overlay on canvas
  useEffect(() => {
    if (!gl || !canvasRef.current || !imageTexture || !imageLoaded || !programRef.current || !positionBufferRef.current) {
      return;
    }

    let animationId: number | null = null;
    
    const renderOverlay = () => {
      if (!gl || !imageTexture || !programRef.current || !positionBufferRef.current) return;

      // Set up for 2D rendering
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      
      // Clear depth buffer to ensure overlay is on top
      // gl.clear(gl.DEPTH_BUFFER_BIT);
      
      const program = programRef.current!;
      const positionBuffer = positionBufferRef.current!;
      
      gl.useProgram(program);
      
      // Bind position buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      
      const positionLocation = gl.getAttribLocation(program, 'a_position');
      const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
      
      gl.enableVertexAttribArray(positionLocation);
      gl.enableVertexAttribArray(texCoordLocation);
      
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
      
      // Bind texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
      
      // Draw only when showImage is true
      if (showImage) {
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        // Continue the animation loop
        animationId = requestAnimationFrame(renderOverlay);
      }
      
    };

    // Start the continuous render loop
    animationId = requestAnimationFrame(renderOverlay);
    animationRef.current = animationId;
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [ imageTexture, imageLoaded, showImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (imageTexture && gl) {
        gl.deleteTexture(imageTexture);
      }
    };
  }, [imageTexture, gl]);

  return null; // This component doesn't render any DOM elements
}; 