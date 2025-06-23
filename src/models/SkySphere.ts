import { mat4 } from "gl-matrix";
import { GLUtils } from "../core/GLUtils";

export class SkySphere {
  private vao: WebGLVertexArrayObject | null = null;
  private texture: WebGLTexture | null = null;
  private program: WebGLProgram;
  private indexCount = 0;
  private ready = false;

  constructor(
    private gl: WebGL2RenderingContext,
    private utils: GLUtils,
    private textureURL: string
  ) {
    this.program = this.utils.createProgram(SkySphere.vertSrc, SkySphere.fragSrc);
    this.setupSphere();
    this.loadTexture();
  }

  isReady() {
    return this.ready;
  }

  private setupSphere() {
    const gl = this.gl;
    const sphere = this.utils.createUVSphere(1, 64, 64, true); // inward facing
    this.indexCount = sphere.indices.length;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(this.program, "a_uv");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  private async loadTexture() {
    this.texture = await this.utils.loadTexture(this.textureURL, 15);
    this.ready = true;
    console.log("SkySphere is ready");
  }

  render(viewMatrix: mat4, projMatrix: mat4) {
    if (!this.ready || !this.vao || !this.texture) return;

    const gl = this.gl;
    gl.depthFunc(gl.LEQUAL);
    gl.useProgram(this.program);

    const viewNoTrans = mat4.clone(viewMatrix);
    viewNoTrans[12] = viewNoTrans[13] = viewNoTrans[14] = 0;

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_view"), false, viewNoTrans);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_proj"), false, projMatrix);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_texture"), 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
    gl.depthFunc(gl.LESS);
  }

  static vertSrc = `#version 300 es
    #pragma vscode_glsllint_stage : vert
    precision mediump float;
    in vec3 a_position;
    in vec2 a_uv;
    out vec2 v_uv;
    uniform mat4 u_view;
    uniform mat4 u_proj;
    void main() {
      v_uv = a_uv;
      vec4 pos = u_proj * u_view * vec4(a_position, 1.0);
      gl_Position = pos.xyww;
    }
  `;

  static fragSrc = `#version 300 es
    #pragma vscode_glsllint_stage : frag
    precision mediump float;
    in vec2 v_uv;
    out vec4 outColor;
    uniform sampler2D u_texture;
    void main() {
      outColor = texture(u_texture, v_uv);
    }
  `;
}
