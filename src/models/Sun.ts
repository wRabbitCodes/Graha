// src/objects/Sun.ts
import { mat4, vec3, vec4 } from "gl-matrix";
import { GLUtils } from "../core/GLUtils";
import { AxisHelper } from "../systems/AxisPlotter";

export class Sun {
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private texture?: WebGLTexture;
  private ready = false;

  constructor(
    private gl: WebGL2RenderingContext,
    private utils: GLUtils,
    private axisHelper: AxisHelper,
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

  render(viewMatrix: mat4, projectionMatrix: mat4) {
    if (!this.texture) return;

    const gl = this.gl;
    gl.useProgram(this.program);

    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Set uniforms
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_view"),
      false,
      viewMatrix
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_proj"),
      false,
      projectionMatrix
    );
    gl.uniform3f(gl.getUniformLocation(this.program, "u_worldPos"), 0, 0, 0); // Sun at origin
    gl.uniform1f(gl.getUniformLocation(this.program, "u_size"), 500.0); // Scale of flare in world units

    gl.activeTexture(gl.TEXTURE0 + 15);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_lensflare"), 15);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
    gl.depthMask(true);

    this.axisHelper.render(viewMatrix, projectionMatrix, mat4.create())
  }

  private createQuadVAO(): WebGLVertexArrayObject {
    const vao = this.gl.createVertexArray()!;
    this.gl.bindVertexArray(vao);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
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

    precision mediump float;
    layout(location = 0) in vec2 a_position;

    uniform mat4 u_view;
    uniform mat4 u_proj;
    uniform vec3 u_worldPos;
    uniform float u_size;

    out vec2 v_uv;

    void main() {
      // Billboard vectors from view matrix
      vec3 right = vec3(u_view[0][0], u_view[1][0], u_view[2][0]);
      vec3 up    = vec3(u_view[0][1], u_view[1][1], u_view[2][1]);

      vec3 offset = a_position.x * right * u_size + a_position.y * up * u_size;
      vec3 worldPos = u_worldPos + offset;

      gl_Position = u_proj * u_view * vec4(worldPos, 1.0);

      v_uv = a_position * 0.5 + 0.5; // Map from [-1,1] to [0,1]
    }

`;

  static fragSrc = `#version 300 es
    #pragma vscode_glsllint_stage : frag

    precision mediump float;
    uniform sampler2D u_lensflare;
    out vec4 fragColor;

    in vec2 v_uv;

    void main() {
      fragColor = texture(u_lensflare, v_uv);
    }
`;
}
