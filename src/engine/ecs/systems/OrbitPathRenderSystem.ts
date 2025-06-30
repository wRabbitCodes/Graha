import { mat4, vec3 } from "gl-matrix";
import { GLUtils } from "../../../utils/GLUtils";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { ModelComponent } from "../components/ModelComponent";
import { OrbitComponent } from "../components/OrbitComponent";
import { OrbitPathRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { RenderContext } from "../../command/IRenderCommands";

export class OrbitPathRenderSystem extends System implements IRenderSystem {
  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    for (const entity of this.registry.getEntitiesWith(
      OrbitComponent,
      ModelComponent
    )) {
      const orbitComp = this.registry.getComponent(entity, OrbitComponent);
      if (orbitComp?.state !== COMPONENT_STATE.READY) continue;
      let renderComp = this.registry.getComponent(
        entity,
        OrbitPathRenderComponent
      );
      if (!renderComp) renderComp = new OrbitPathRenderComponent();
      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED) this.initialize(orbitComp, renderComp);
      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
            gl.useProgram(renderComp.program);

            gl.uniformMatrix4fv(gl.getUniformLocation(renderComp.program!, "u_model"), false, mat4.create());
            gl.uniformMatrix4fv(gl.getUniformLocation(renderComp.program!, "u_view"), false, ctx.viewMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(renderComp.program!, "u_proj"), false, ctx.projectionMatrix);
            
            gl.bindVertexArray(renderComp.VAO!);

            gl.drawArrays(gl.LINE_STRIP, 0, renderComp.pathVertices.length / 3);
            // After drawing the line strip...
            this.renderAnnotation(renderComp, renderComp.perihelion, [1, 0.2, 0.2, 1]);  // red = perihelion
            this.renderAnnotation(renderComp, renderComp.aphelion, [0.2, 0.6, 1, 1]);   // blue = aphelion

             gl.bindVertexArray(null);
        }
      })
    }
  }

  private initialize(
    orbitComp: OrbitComponent,
    renderComp: OrbitPathRenderComponent
  ) {
    renderComp.program = this.utils.createProgram(
      renderComp.vertSrc,
      renderComp.fragSrc
    );
    this.setupRenderPoints(orbitComp, renderComp);
    this.setupVAO(renderComp);
    renderComp.state = COMPONENT_STATE.READY;
  }

  private setupRenderPoints(
    orbitComp: OrbitComponent,
    renderComp: OrbitPathRenderComponent
  ) {
    const {
      semiMajorAxis: a,
      eccentricity: e,
      inclination,
      longitudeOfAscendingNode: Ωdeg,
      argumentOfPeriapsis: ωdeg,
    } = orbitComp;
    const i = (inclination! * Math.PI) / 180;
    const Ω = (Ωdeg! * Math.PI) / 180;
    const ω = (ωdeg! * Math.PI) / 180;

    const segments = 180;
    const trailLength = 2 * Math.PI;
    const points: number[] = [];

    for (let j = 0; j <= segments; j++) {
      const M = (j / segments) * trailLength;
      const E = this.solveKepler(M, e!);

      const θ =
        2 *
        Math.atan2(
          Math.sqrt(1 + e!) * Math.sin(E / 2),
          Math.sqrt(1 - e!) * Math.cos(E / 2)
        );

      const r = a! * (1 - e! * Math.cos(E));

      const x =
        r *
        (Math.cos(Ω) * Math.cos(θ + ω) -
          Math.sin(Ω) * Math.sin(θ + ω) * Math.cos(i));
      const y =
        r *
        (Math.sin(Ω) * Math.cos(θ + ω) +
          Math.cos(Ω) * Math.sin(θ + ω) * Math.cos(i));
      const z = r * Math.sin(θ + ω) * Math.sin(i);

      const finalPos = vec3.fromValues(x, y, z);
      const rotX = mat4.create();
      mat4.fromXRotation(rotX, -Math.PI / 2);

      vec3.transformMat4(finalPos, finalPos, rotX);
      points.push(finalPos[0], finalPos[1], finalPos[2]);
    }
    renderComp.pathVertices = points;
  }

  private setupVAO(renderComp: OrbitPathRenderComponent) {
    const vertices = new Float32Array(renderComp.pathVertices);
    const gl = this.utils.gl;
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    renderComp.VAO = vao;
  }

  private solveKepler(M: number, e: number): number {
    let E = M;
    for (let i = 0; i < 10; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }

   private renderAnnotation(renderComp: OrbitPathRenderComponent, pos: vec3, color: [number, number, number, number]) {
    const gl = this.utils.gl;
    const uColor = gl.getUniformLocation(renderComp.program!, "u_overrideColor");
    gl.uniform4fv(uColor, color);

    const model = mat4.create();
    mat4.translate(model, model, pos);
    mat4.scale(model, model, [0.2, 0.2, 0.2]); // small point

    gl.uniformMatrix4fv(gl.getUniformLocation(renderComp.program!, "u_model"), false, model);
    gl.drawArrays(gl.POINTS, 0, 1); // Assumes POINT primitive or make a tiny sphere
  }

}
