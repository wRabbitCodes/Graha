import { mat4, vec3, vec2, vec4 } from "gl-matrix";
import { GLUtils } from "../core/GLUtils";

export class Popup {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private utils: GLUtils;
  private vao: WebGLVertexArrayObject;
  private buffer: WebGLBuffer;
  private texture?: WebGLTexture;

  private size: vec2 = vec2.fromValues(5, 2.5);
  private center: vec3 = vec3.create();
  private color: vec4 = [0.2, 1.0, 0.8, 0.8];
  private modelMatrix: mat4 = mat4.create();
  private texCanvas?: HTMLCanvasElement;

  private static readonly popupQuad = new Float32Array([
    // x, y,    u, v
    -0.5, -0.5, 0, 0, 0.5, -0.5, 1, 0, -0.5, 0.5, 0, 1, 0.5, 0.5, 1, 1,
  ]);

  constructor(gl: WebGL2RenderingContext, utils: GLUtils) {
    this.gl = gl;
    this.utils = utils;

    this.program = utils.createProgram(
      `#version 300 es
      precision mediump float;
      layout(location = 0) in vec2 a_position;
      layout(location = 1) in vec2 a_uv;

      uniform mat4 u_model;
      uniform mat4 u_view;
      uniform mat4 u_proj;

      out vec2 v_uv;

      void main() {
        v_uv = a_uv;
        vec4 world = u_model * vec4(a_position, 0.0, 1.0);
        gl_Position = u_proj * u_view * world;
      }`,

            `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_text;
      out vec4 fragColor;
      void main() {
        fragColor = texture(u_text, v_uv);
      }`
    );

    this.vao = gl.createVertexArray()!;
    this.buffer = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, Popup.popupQuad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    this.createTextTexture("Hello Planet");
  }

  createTextTexture(text: string) {
    const canvas = document.createElement("canvas");
    this.texCanvas = canvas;
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "#00ffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      canvas
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.LINEAR
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.LINEAR
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE
    );
    this.texture = tex;
  }

  setSizeRelativeToPlanet(radius: number) {
    const widthRatio = 6; // Width is 1.5× radius
    const heightRatio = 3; // Height is 0.75× radius
    vec2.set(this.size, radius * widthRatio, radius * heightRatio);
  }

  updatePopupPosition(planetPosition: vec3, offsetY = 3.0) {
    const popupPos = vec3.create();
    vec3.set(
      popupPos,
      planetPosition[0],
      planetPosition[1] + offsetY + this.texCanvas?.height!,
      planetPosition[2]
    );
    mat4.fromTranslation(this.modelMatrix, popupPos);
  }

  draw(proj: mat4, view: mat4, cameraPos: vec3) {
    if (!this.texture) return;

    const gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST); // Optional: to render over planets

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Billboard logic — rotate to face camera
    const billboard = mat4.create();
    const viewInverse = mat4.invert(mat4.create(), view)!;

    // Use only rotation part (upper-left 3x3)
    for (let i = 0; i < 3; ++i)
      for (let j = 0; j < 3; ++j) billboard[i * 4 + j] = viewInverse[i * 4 + j];

    // Combine translation (from modelMatrix) + billboard rotation
    const finalModel = mat4.create();
    mat4.multiply(finalModel, this.modelMatrix, billboard); // T * R
    mat4.scale(finalModel, finalModel, [this.size[0], this.size[1], 1]); // apply size

    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_model"),
      false,
      finalModel
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_view"),
      false,
      view
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_proj"),
      false,
      proj
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_text"), 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }
}
