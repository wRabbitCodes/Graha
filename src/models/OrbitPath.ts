import { mat4, vec3 } from "gl-matrix";
import { GLUtils } from "../utils/GLUtils";

export class OrbitPath {
  private vao: WebGLVertexArrayObject | null = null;
  private indexCount = 0;
  private program: WebGLProgram;
  private perihelion = vec3.create();
  private aphelion = vec3.create();


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
    const {
      semiMajorAxis: a,
      eccentricity: e,
      inclination,
      longitudeOfAscendingNode: Ωdeg,
      argumentOfPeriapsis: ωdeg
    } = this.orbitParams;

    const i = inclination * Math.PI / 180;
    const Ω = Ωdeg * Math.PI / 180;
    const ω = ωdeg * Math.PI / 180;

    const segments = 180;
    const points: number[] = [];

    for (let j = 0; j <= segments; j++) {
      const M = (j / segments) * 2 * Math.PI;
      const E = this.solveKepler(M, e);

      const θ = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
      );

      const r = a * (1 - e * Math.cos(E));

      const x =
        r * (Math.cos(Ω) * Math.cos(θ + ω) -
            Math.sin(Ω) * Math.sin(θ + ω) * Math.cos(i));
      const y =
        r * (Math.sin(Ω) * Math.cos(θ + ω) +
            Math.cos(Ω) * Math.sin(θ + ω) * Math.cos(i));
      const z = r * Math.sin(θ + ω) * Math.sin(i);

      // points.push(x, y, z);


      const finalPos = vec3.fromValues(x, y, z);

// Rotation matrix: -90° around X-axis
const rotX = mat4.create();
mat4.fromXRotation(rotX, -Math.PI / 2);

vec3.transformMat4(finalPos, finalPos, rotX);
points.push(finalPos[0], finalPos[1], finalPos[2])

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

  private solveKepler(M: number, e: number): number {
    let E = M;
    for (let i = 0; i < 10; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }
  private renderAnnotation(pos: vec3, color: [number, number, number, number]) {
    const gl = this.gl;
    const uColor = gl.getUniformLocation(this.program, "u_overrideColor");
    gl.uniform4fv(uColor, color);

    const model = mat4.create();
    mat4.translate(model, model, pos);
    mat4.scale(model, model, [0.2, 0.2, 0.2]); // small point

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_model"), false, model);
    gl.drawArrays(gl.POINTS, 0, 1); // Assumes POINT primitive or make a tiny sphere
  }


  public render(view: mat4, proj: mat4) {
    
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_model"), false, mat4.create());
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_view"), false, view);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_proj"), false, proj);

    gl.drawArrays(gl.LINE_STRIP, 0, this.indexCount);
    // After drawing the line strip...
    this.renderAnnotation(this.perihelion, [1, 0.2, 0.2, 1]);  // red = perihelion
    this.renderAnnotation(this.aphelion, [0.2, 0.6, 1, 1]);   // blue = aphelion

    gl.bindVertexArray(null);
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
