import { mat4 } from "gl-matrix";
import { GLUtils } from "../core/GLUtils";

export class OrbitPath {
  private vao: WebGLVertexArrayObject;
  private buffer: WebGLBuffer;
  private program: WebGLProgram;
  private segments = 128;
  private vertexCount: number;

  constructor(
    private gl: WebGL2RenderingContext,
    private utils: GLUtils,
    private radius: number,
    private color: [number, number, number] = [0.5, 0.5, 0.5]
  ) {
    this.program = this.utils.createProgram(OrbitPath.vertSrc, OrbitPath.fragSrc);
    const vertices: number[] = [];

    for (let i = 0; i <= this.segments; i++) {
      const angle = (i / this.segments) * Math.PI * 2;
      vertices.push(Math.cos(angle) * this.radius, 0, Math.sin(angle) * this.radius);
    }

    this.vertexCount = vertices.length / 3;

    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    const loc = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  render(view: mat4, projection: mat4) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_view"),
      false,
      view
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_proj"),
      false,
      projection
    );
    gl.uniform3fv(gl.getUniformLocation(this.program, "u_color"), this.color);

    gl.drawArrays(gl.LINE_STRIP, 0, this.vertexCount);
    gl.bindVertexArray(null);
  }

  static vertSrc = `#version 300 es
    #pragma vscode_glsllint_stage : vert
    precision mediump float;
    layout(location = 0) in vec3 a_position;
    uniform mat4 u_view;
    uniform mat4 u_proj;
    void main() {
      gl_Position = u_proj * u_view * vec4(a_position, 1.0);
    }
  `;

  static fragSrc = `#version 300 es
    #pragma vscode_glsllint_stage : frag
    precision mediump float;
    uniform vec3 u_color;
    out vec4 outColor;
    void main() {
      outColor = vec4(u_color, 1.0);
    }
  `;
}
