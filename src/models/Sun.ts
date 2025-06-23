import { mat4, vec3 } from "gl-matrix";
import { GLUtils } from "../core/GLUtils";

export class Sun {
  private vao: WebGLVertexArrayObject;
  private program: WebGLProgram;
  private texture?: WebGLTexture;
  private position: vec3 = vec3.fromValues(0, 0, 0);
  private scale: number;
  private ready = false;

  constructor(
    private gl: WebGL2RenderingContext,
    private utils: GLUtils,
    private textureURL: string,
    scale: number = 500
  ) {
    this.program = this.utils.createProgram(Sun.vertSrc, Sun.fragSrc);
    this.vao = this.initVAO();
    // Use separate texture unit
    this.scale = scale;
  }

  private initVAO(): WebGLVertexArrayObject {
    const gl = this.gl;

    const quad = new Float32Array([
      -1, -1, 0,
      1, -1, 0,
      -1, 1, 0,
      1, 1, 0
    ]);

    const vao = gl.createVertexArray()!;
    const vbo = gl.createBuffer()!;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    return vao;
  }

  private async loadTexture() {
    await this.utils.loadTexture(this.textureURL, 15);
    this.ready = true;
  }

  isReady() {
    return this.ready;
  }

  render(viewMatrix: mat4, projMatrix: mat4, cameraPos: vec3) {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive

    // Billboard: place a quad at the origin always facing camera
    const model = mat4.create();
    mat4.translate(model, model, this.position);
    mat4.scale(model, model, [this.scale, this.scale, this.scale]);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_model"), false, model);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_view"), false, viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_proj"), false, projMatrix);

    gl.activeTexture(gl.TEXTURE0 + 6); // match your texture unit
    gl.bindTexture(gl.TEXTURE_2D, this.texture!);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_lensflare"), 6);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  getLightPosition(): vec3 {
    return this.position;
  }

  static vertSrc = `#version 300 es
    precision highp float;
    in vec3 a_position;
    uniform mat4 u_model, u_view, u_proj;
    void main() {
      gl_Position = u_proj * u_view * u_model * vec4(a_position, 1.0);
    }
  `;

  static fragSrc = `#version 300 es
    precision mediump float;
    uniform sampler2D u_lensflare;
    out vec4 outColor;
    void main() {
      vec2 uv = gl_FragCoord.xy / vec2(1920.0, 1080.0); // fallback
      vec4 texColor = texture(u_lensflare, uv);
      outColor = texColor;
    }
  `;
}
