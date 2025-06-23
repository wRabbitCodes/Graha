// src/core/GLUtils.ts

interface SphereMesh {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}
export class GLUtils {
  constructor(private gl: WebGL2RenderingContext) { }


  
  createUVSphere(radius: number, latBands: number, longBands: number): SphereMesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
  
    for (let latNumber = 0; latNumber <= latBands; latNumber++) {
      const theta = (latNumber * Math.PI) / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
  
      for (let longNumber = 0; longNumber <= longBands; longNumber++) {
        const phi = (longNumber * 2 * Math.PI) / longBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
  
        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;
        const u = 1 - longNumber / longBands;
        const v = 1 - latNumber / latBands;
  
        positions.push(radius * x, radius * y, radius * z);
        normals.push(x, y, z);
        uvs.push(u, v);
      }
    }
  
    for (let latNumber = 0; latNumber < latBands; latNumber++) {
      for (let longNumber = 0; longNumber < longBands; longNumber++) {
        const first = latNumber * (longBands + 1) + longNumber;
        const second = first + longBands + 1;
  
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }
  
    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices),
    };
  }
  

  createShader(type: GLenum, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error("Shader compile error: " + this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  createProgram(vert: string, frag: string): WebGLProgram {
    const program = this.gl.createProgram()!;
    const v = this.createShader(this.gl.VERTEX_SHADER, vert);
    const f = this.createShader(this.gl.FRAGMENT_SHADER, frag);
    this.gl.attachShader(program, v);
    this.gl.attachShader(program, f);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
  console.error(this.gl.getProgramInfoLog(program));
}

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error("Program link error: " + this.gl.getProgramInfoLog(program));
    }
    return program;
  }

  async loadTexture(url: string, textureUnit: number): Promise<WebGLTexture> {
    const gl = this.gl;
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = url;
      image.crossOrigin = "anonymous"; // If loading from external URLs
      image.onload = () => {
        const texture = gl.createTexture();
        if (!texture) return reject("Failed to create texture");

        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Setup texture parameters
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        gl.bindTexture(gl.TEXTURE_2D, null);
        resolve(texture);
      };
      image.onerror = (e) => reject(e);
    });
  }

}
