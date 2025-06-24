import { mat4, vec3 } from "gl-matrix";

export class AxisHelper {
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private program: WebGLProgram;

  private scale = 5;
  constructor(private gl: WebGL2RenderingContext, private utils: any) {
    const axisVertices = new Float32Array([
      // X (red)
      0, 0, 0, 0, 0, 0,
      // Y (green)
      0, -this.scale, 0, 0, this.scale, 0,
      // Z (blue)
      0, 0, 0, 0, 0, 0,
    ]);

    this.program = this.utils.createProgram(
      `#version 300 es
      #pragma vscode_glsllint_stage : vert
      precision mediump float;
      layout(location = 0) in vec3 a_position;
      uniform mat4 u_mvp;
      void main() {
        gl_Position = u_mvp * vec4(a_position, 1.0);
      }`,

      `#version 300 es
      #pragma vscode_glsllint_stage : stage
      precision mediump float;
      out vec4 fragColor;
      uniform vec3 u_color;
      void main() {
        fragColor = vec4(u_color, 1.0);
      }`
    );

    this.vao = gl.createVertexArray()!;
    this.vbo = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, axisVertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  public render(view: mat4, proj: mat4, model: mat4) {
    const gl = this.gl;
    const mvp = mat4.create();
    mat4.multiply(mvp, view, model);
    mat4.multiply(mvp, proj, mvp);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    const u_mvp = gl.getUniformLocation(this.program, "u_mvp");
    const u_color = gl.getUniformLocation(this.program, "u_color");

    gl.uniformMatrix4fv(u_mvp, false, mvp);

    // X-axis: red
    gl.uniform3f(u_color, 1, 0, 0);
    gl.drawArrays(gl.LINES, 0, 2);

    // Y-axis: green
    gl.uniform3f(u_color, 0, 1, 0);
    gl.drawArrays(gl.LINES, 2, 2);

    // Z-axis: blue
    gl.uniform3f(u_color, 0, 0, 1);
    gl.drawArrays(gl.LINES, 4, 2);

    gl.bindVertexArray(null);
  }
}
