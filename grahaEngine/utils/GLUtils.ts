// src/core/GLUtils.ts

export type SphereMesh = {
  positions: Float32Array;
  normals: Float32Array;
  tangents: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
};

export class GLUtils {
  constructor(public gl: WebGL2RenderingContext) {}

  createUVSphere(
    radius: number,
    latBands: number,
    longBands: number,
    invert = false
  ): SphereMesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const tangentsAccum: number[][] = [];

    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat * Math.PI) / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= longBands; lon++) {
        const phi = (lon * 2 * Math.PI) / longBands;
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
        tangentsAccum.push([0, 0, 0]); // Init empty tangent
      }
    }

    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < longBands; lon++) {
        const i0 = lat * (longBands + 1) + lon;
        const i1 = i0 + 1;
        const i2 = i0 + longBands + 1;
        const i3 = i2 + 1;

        const tris = invert
          ? [
              [i0, i1, i2],
              [i2, i1, i3],
            ]
          : [
              [i0, i2, i1],
              [i2, i3, i1],
            ];

        for (const [a, b, c] of tris) {
          const p0 = positions.slice(a * 3, a * 3 + 3);
          const p1 = positions.slice(b * 3, b * 3 + 3);
          const p2 = positions.slice(c * 3, c * 3 + 3);

          const uv0 = uvs.slice(a * 2, a * 2 + 2);
          const uv1 = uvs.slice(b * 2, b * 2 + 2);
          const uv2 = uvs.slice(c * 2, c * 2 + 2);

          const edge1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
          const edge2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

          const deltaUV1 = [uv1[0] - uv0[0], uv1[1] - uv0[1]];
          const deltaUV2 = [uv2[0] - uv0[0], uv2[1] - uv0[1]];

          const f =
            1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV2[0] * deltaUV1[1]);

          const tangent = [
            f * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]),
            f * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]),
            f * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2]),
          ];

          for (const i of [a, b, c]) {
            tangentsAccum[i][0] += tangent[0];
            tangentsAccum[i][1] += tangent[1];
            tangentsAccum[i][2] += tangent[2];
          }

          indices.push(a, b, c);
        }
      }
    }

    const tangents: number[] = tangentsAccum
      .map((tangent) => {
        const len = Math.hypot(...tangent) || 1.0;
        return [tangent[0] / len, tangent[1] / len, tangent[2] / len];
      })
      .flat();

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      tangents: new Float32Array(tangents),
      indices: new Uint16Array(indices),
    };
  }

  createShader(type: GLenum, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(
        "Shader compile error: " + this.gl.getShaderInfoLog(shader)
      );
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
      throw new Error(
        "Program link error: " + this.gl.getProgramInfoLog(program)
      );
    }
    return program;
  }

  async loadTexture(url: string, textureUnit?: number): Promise<WebGLTexture> {
    const gl = this.gl;
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = url;
      image.crossOrigin = "anonymous"; // If loading from external URLs
      image.onload = () => {
        requestIdleCallback(() => {
          const texture = gl.createTexture();
          if (!texture) return reject("Failed to create texture");
          gl.activeTexture(gl.TEXTURE0 + (textureUnit ?? 0));
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
          );

          // Setup texture parameters
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR_MIPMAP_LINEAR
          );
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

          gl.bindTexture(gl.TEXTURE_2D, null);
          resolve(texture);
        });
      };
      image.onerror = (e) => reject(e);
    });
  }
}
