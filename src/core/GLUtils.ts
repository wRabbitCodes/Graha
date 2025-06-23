// src/core/GLUtils.ts

interface SphereMesh {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}
export class GLUtils {
  constructor(private gl: WebGL2RenderingContext) { }

  createUVSphere(radius: number, latBands: number, longBands: number, invert = false): SphereMesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let lat = 0; lat <= latBands; lat++) {
    const theta = lat * Math.PI / latBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= longBands; lon++) {
      const phi = lon * 2 * Math.PI / longBands;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      let x = cosPhi * sinTheta;
      let y = cosTheta;
      let z = sinPhi * sinTheta;

      let nx = x;
      let ny = y;
      let nz = z;

      if (invert) {
        x = -x;
        y = -y;
        z = -z;
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }

      positions.push(radius * x, radius * y, radius * z);
      normals.push(nx, ny, nz);
      uvs.push(1 - lon / longBands, 1 - lat / latBands);
    }
  }

  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < longBands; lon++) {
      const first = lat * (longBands + 1) + lon;
      const second = first + longBands + 1;

      if (invert) {
        indices.push(first, first + 1, second);
        indices.push(second, first + 1, second + 1);
      } else {
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
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
