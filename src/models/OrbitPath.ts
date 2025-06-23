import { mat4 } from "gl-matrix";
import { GLUtils } from "../core/GLUtils";

export class OrbitPath {
  private vao: WebGLVertexArrayObject | null = null;
  private indexCount = 0;
  private program: WebGLProgram;

  constructor(
    private gl: WebGL2RenderingContext,
    private utils: GLUtils,
    private orbitParams: {
      semiMajorAxis: number;   // a (in scene units, e.g., scaled km)
      eccentricity: number;    // e
      inclination: number;     // i (degrees)
      longitudeOfAscendingNode: number; // Ω (degrees)
      argumentOfPeriapsis: number;      // ω (degrees)
    }
  ) {
    this.program = this.utils.createProgram(OrbitPath.vertSrc, OrbitPath.fragSrc);
    this.setupEllipseMesh();
  }

  private setupEllipseMesh() {
    const { semiMajorAxis: a, eccentricity: e } = this.orbitParams;
    const b = a * Math.sqrt(1 - e * e); // semi-minor axis

    const points: number[] = [];
    const segments = 180;

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * 2 * Math.PI;
      const x = a * Math.cos(theta) - a * e; // center at focus (sun)
      const y = b * Math.sin(theta);
      points.push(x, 0, y);
    }

    const vertices = new Float32Array(points);

    const vao = this.gl.createVertexArray();
    const vbo = this.gl.createBuffer();
    if (!vao || !vbo) throw new Error("Failed to create buffers");

    this.gl.bindVertexArray(vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    const loc = this.gl.getAttribLocation(this.program, "a_position");
    this.gl.enableVertexAttribArray(loc);
    this.gl.vertexAttribPointer(loc, 3, this.gl.FLOAT, false, 0, 0);

    this.vao = vao;
    this.indexCount = vertices.length / 3;

    this.gl.bindVertexArray(null);
  }

  public render(view: mat4, proj: mat4) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    const model = this.computeTransformMatrix();
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_model"), false, model);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_view"), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_proj"), false, proj);

    gl.drawArrays(gl.LINE_STRIP, 0, this.indexCount);
    gl.bindVertexArray(null);
  }

  private computeTransformMatrix(): mat4 {
    const { inclination, longitudeOfAscendingNode: Ω, argumentOfPeriapsis: ω } = this.orbitParams;
    const model = mat4.create();

    // Order: rotate around Z (Ω), then X (i), then Z (ω)
    mat4.rotateZ(model, model, Ω * Math.PI / 180);
    mat4.rotateX(model, model, inclination * Math.PI / 180);
    mat4.rotateZ(model, model, ω * Math.PI / 180);

    return model;
  }

  static vertSrc = `#version 300 es
    #pragma vscode_glsllint_stage : vert
    precision mediump float;
    layout(location = 0) in vec3 a_position;
    uniform mat4 u_model, u_view, u_proj;
    void main() {
      gl_Position = u_proj * u_view * u_model * vec4(a_position, 1.0);
    }
  `;

  static fragSrc = `#version 300 es
    #pragma vscode_glsllint_stage : frag
    precision mediump float;
    out vec4 fragColor;
    void main() {
      fragColor = vec4(1.0, 1.0, 1.0, 0.6); // white translucent orbit
    }
  `;
}
