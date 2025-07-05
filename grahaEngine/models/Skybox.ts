import { mat4 } from "gl-matrix";
import { GLUtils } from "../utils/GLUtils";

export class Skybox {
  private vao: WebGLVertexArrayObject | null = null;
  private texture: WebGLTexture | null = null;
  private program: WebGLProgram;
  private readonly totalFaces = 6;
  private skyboxReady = false;

  private static vertices = new Float32Array([
    // Back
    -1, 1, -1, -1, -1, -1, 1, -1, -1,
    1, -1, -1, 1, 1, -1, -1, 1, -1,
    // Left
    -1, -1, 1, -1, -1, -1, -1, 1, -1,
    -1, 1, -1, -1, 1, 1, -1, -1, 1,
    // Right
    1, -1, -1, 1, -1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, -1, 1, -1, -1,
    // Front
    -1, -1, 1, -1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, -1, 1, -1, -1, 1,
    // Top
    -1, 1, -1, 1, 1, -1, 1, 1, 1,
    1, 1, 1, -1, 1, 1, -1, 1, -1,
    // Bottom
    -1, -1, -1, -1, -1, 1, 1, -1, 1,
    1, -1, 1, 1, -1, -1, -1, -1, -1,
  ]);


  private static vertSrc = `#version 300 es
    #pragma vscode_glsllint_stage : vert
    precision mediump float;
    in vec3 a_position;
    out vec3 v_texCoord;
    uniform mat4 u_view;
    uniform mat4 u_proj;
    void main() {
      v_texCoord = a_position;
      vec4 pos = u_proj * u_view * vec4(a_position, 1.0);
      gl_Position = pos.xyww;
    }
  `;

  private static fragSrc = `#version 300 es
    #pragma vscode_glsllint_stage : frag
    precision mediump float;
    in vec3 v_texCoord;
    out vec4 outColor;
    uniform samplerCube u_skybox;
    void main() {
      outColor = texture(u_skybox, normalize(v_texCoord));
    }
  `;

  constructor(private gl: WebGL2RenderingContext, private utils: GLUtils) {
    this.program = this.utils.createProgram(Skybox.vertSrc, Skybox.fragSrc);
    this.setupVAO();
  }

  private setupVAO() {
    const gl = this.gl;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, Skybox.vertices, gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  public loadCubeMap(faces: { target: GLenum, src: string }[]) {

    const gl = this.gl;
    const texture = gl.createTexture();
    let loadedFaces = 0;
    if (!texture) throw new Error("Failed to create cube texture");
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    for (const face of faces) {
      const image = new Image();
      image.src = face.src;
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.texImage2D(
          face.target,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image
        );

        loadedFaces++;
        if (loadedFaces === this.totalFaces) {
          gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
          gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

          this.skyboxReady = true;
          console.log("Skybox is ready");
        }
      };
    }

    this.texture = texture;
  }

  isReady() {
    return this.skyboxReady;
  }

  public render(view: mat4, proj: mat4) {
    const gl = this.gl;
    gl.depthFunc(gl.LEQUAL);
    gl.useProgram(this.program);

    // Remove translation from view matrix
    const viewNoTranslate = mat4.clone(view);
    viewNoTranslate[12] = viewNoTranslate[13] = viewNoTranslate[14] = 0;

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_view"), false, viewNoTranslate);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_proj"), false, proj);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_skybox"), 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
    gl.bindVertexArray(null);
    gl.depthFunc(gl.LESS);
  }
}
