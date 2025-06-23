// src/objects/Sun.ts
import { mat4, vec3 } from "gl-matrix";
import { GLUtils } from "../core/GLUtils";

export class Sun {
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private texture?: WebGLTexture;
  private ready = false;

  constructor(
    private gl: WebGL2RenderingContext,
    private utils: GLUtils,
    private lensflareURL: string,
    private lightPos: vec3 = vec3.fromValues(0, 0, 0)
  ) {
    this.program = this.utils.createProgram(Sun.vertSrc, Sun.fragSrc);
    this.vao = this.createQuadVAO();
    this.utils.loadTexture(this.lensflareURL, 6).then((tex) => {
      this.texture = tex!;
      this.ready = true;
    });
  }
  
  isReady() {
    return this.ready;
  }

  getPosition(): vec3 {
    return this.lightPos;
  }

  render(viewMatrix: mat4, projectionMatrix: mat4, cameraPos: vec3) {
    if (!this.texture) return;

    // Is sun in view?
    const sunToCamera = vec3.subtract(vec3.create(), this.lightPos, cameraPos);
    const forward = vec3.normalize(vec3.create(), [
      -viewMatrix[2], -viewMatrix[6], -viewMatrix[10],
    ]);
    const dot = vec3.dot(vec3.normalize(vec3.create(), sunToCamera), forward);
    if (dot < 0.7) return; // Only render if facing sun

    const gl = this.gl;
    gl.useProgram(this.program);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.activeTexture(gl.TEXTURE0 + 15);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_lensflare"), 15);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
  }

  private createQuadVAO(): WebGLVertexArrayObject {
    const vao = this.gl.createVertexArray()!;
    this.gl.bindVertexArray(vao);

    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    const buffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const loc = this.gl.getAttribLocation(this.program, "a_position");
    this.gl.enableVertexAttribArray(loc);
    this.gl.vertexAttribPointer(loc, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindVertexArray(null);
    return vao;
  }

  static vertSrc = `#version 300 es
  #pragma vscode_glsllint_stage : vert
  in vec2 a_position;
  out vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

  static fragSrc = `#version 300 es
  #pragma vscode_glsllint_stage : frag
  precision mediump float;
  in vec2 v_uv;
  uniform sampler2D u_lensflare;
  out vec4 outColor;
  void main() {
    vec4 tex = texture(u_lensflare, v_uv);
    outColor = vec4(tex.rgb, tex.a);
  }`;
}
