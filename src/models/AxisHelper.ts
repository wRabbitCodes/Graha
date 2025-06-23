import { mat4 } from "gl-matrix";
import { GLUtils } from "../core/GLUtils";

export class AxisHelper {
  private vao: WebGLVertexArrayObject;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;

  constructor(private gl: WebGL2RenderingContext, private utils: GLUtils) {
    this.program = this.utils.createProgram(AxisHelper.vertSrc, AxisHelper.fragSrc);

    const axisVertices = new Float32Array([
      // X-axis (red)
      0, 0, 0, 1, 0, 0,
      // Y-axis (green)
      0, 0, 0, 0, 1, 0,
      // Z-axis (blue)
      0, 0, 0, 0, 0, 1,
    ]);

    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, axisVertices, gl.STATIC_DRAW);

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    const posLoc = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  render(view: mat4, projection: mat4) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_view"), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_proj"), false, projection);

    const colors = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];

    for (let i = 0; i < 3; i++) {
      gl.uniform3fv(gl.getUniformLocation(this.program, "u_color"), colors[i]);
      gl.drawArrays(gl.LINES, i * 2, 2);
    }

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
