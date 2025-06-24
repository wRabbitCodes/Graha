import { mat4 } from "gl-matrix";

export class BoundingBoxHelper {
  private vao: WebGLVertexArrayObject;
  private program: WebGLProgram;
  private indexCount: number;

  constructor(private gl: WebGL2RenderingContext) {
    const positions = new Float32Array([
      -1, -1, -1,   1, -1, -1,   1,  1, -1,  -1,  1, -1, // back face
      -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1, // front face
    ]);

    const indices = new Uint16Array([
      0, 1, 1, 2, 2, 3, 3, 0,       // back face edges
      4, 5, 5, 6, 6, 7, 7, 4,       // front face edges
      0, 4, 1, 5, 2, 6, 3, 7        // side edges
    ]);

    this.indexCount = indices.length;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, `#version 300 es
      precision highp float;
      layout(location = 0) in vec3 a_position;
      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_proj;
      void main() {
        gl_Position = u_proj * u_view * u_model * vec4(a_position, 1.0);
      }
    `);

    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, `#version 300 es
      precision mediump float;
      out vec4 fragColor;
      void main() {
        fragColor = vec4(1.0, 0.0, 0.0, 1.0); // red wireframe
      }
    `);

    this.program = this.createProgram(vertexShader, fragmentShader);

    const vao = this.gl.createVertexArray()!;
    this.gl.bindVertexArray(vao);

    const posBuffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, posBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);

    const indexBuffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);

    this.gl.bindVertexArray(null);
    this.vao = vao;
  }

  render(modelMatrix: mat4, viewMatrix: mat4, projMatrix: mat4) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_model"), false, modelMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_view"), false, viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_proj"), false, projMatrix);

    gl.drawElements(gl.LINES, this.indexCount, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error("Shader compile error: " + this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  private createProgram(vs: WebGLShader, fs: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error("Program link error: " + this.gl.getProgramInfoLog(program));
    }
    return program;
  }
}
