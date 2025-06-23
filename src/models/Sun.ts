import { vec3, mat4 } from "gl-matrix";
import { Star } from "./Star";
import { GLUtils } from "../core/GLUtils";

export class Sun extends Star {
  private gl: WebGL2RenderingContext;
  private utils: GLUtils;

  private program: WebGLProgram;
  private vao?: WebGLVertexArrayObject;
  private indexCount: number = 0;

  constructor(
    gl: WebGL2RenderingContext,
    utils: GLUtils,
    position: vec3 = vec3.create(),
    color: vec3 = vec3.fromValues(1, 1, 0),
    intensity: number = 1
  ) {
    super(position, color, intensity);
    this.gl = gl;
    this.utils = utils;

    this.program = this.utils.createProgram(Sun.vertexShaderSrc, Sun.fragmentShaderSrc);

    this.setupMesh();
  }

  private setupMesh() {
    // Similar UV sphere like Planet but simpler
    const sphere = this.utils.createUVSphere(2, 30, 30);
    this.indexCount = sphere.indices.length;

    const gl = this.gl;

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    // Positions
    const posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    // Normals
    const normalBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
    const normalLoc = gl.getAttribLocation(this.program, "a_normal");
    gl.enableVertexAttribArray(normalLoc);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    // Indices
    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  update(deltaTime: number) {
    // Sun can slowly pulse or rotate if you want
  }

  render(viewMatrix: mat4, projectionMatrix: mat4) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao!);

    mat4.fromTranslation(this.modelMatrix, this.position);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_model"), false, this.modelMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_view"), false, viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_proj"), false, projectionMatrix);

    gl.uniform3fv(gl.getUniformLocation(this.program, "u_color"), this.color);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_intensity"), this.intensity);

    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

    gl.bindVertexArray(null);
  }

  getLightPosition(): vec3 {
    return this.position;
  }

  getLightColor(): vec3 {
    return this.color;
  }

  getLightIntensity(): number {
    return this.intensity;
  }

  // Simple shaders to render a glowing yellow sphere
  static vertexShaderSrc = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 a_position;
    layout(location=1) in vec3 a_normal;

    uniform mat4 u_model;
    uniform mat4 u_view;
    uniform mat4 u_proj;

    out vec3 v_normal;

    void main() {
      v_normal = mat3(u_model) * a_normal;
      gl_Position = u_proj * u_view * u_model * vec4(a_position, 1.0);
    }
  `;

  static fragmentShaderSrc = `#version 300 es
    precision mediump float;

    in vec3 v_normal;
    uniform vec3 u_color;
    uniform float u_intensity;

    out vec4 fragColor;

    void main() {
      float glow = max(dot(normalize(v_normal), vec3(0, 0, 1)), 0.0);
      fragColor = vec4(u_color * u_intensity * glow, 1.0);
    }
  `;
}
