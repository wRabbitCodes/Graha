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
import { Entity } from "../Entity";
import { SETTINGS } from "../../../config/settings";
import { OrbitUtils } from "../../../utils/OrbitUtils";

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
      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED) this.initialize(entity, orbitComp, renderComp);
      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      // Animate trail head
      const now = performance.now() / 1000;
      const cycle = renderComp.pathVertices.length / 3;
      const headIndex = (now * 30) % cycle; // speed: 30 verts/sec

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {


          const totalVerts = renderComp.pathVertices.length / 3;
          const now = performance.now() / 1000;


          const theta = OrbitUtils.trueAnomalyAtTime(now, orbitComp);
          const progress = OrbitUtils.orbitProgress(theta); // [0, 1]
          const head = progress * totalVerts;
          // const head = (now * 30.0) % totalVerts;

          gl.useProgram(renderComp.program);
          

          gl.uniformMatrix4fv(gl.getUniformLocation(renderComp.program!, "u_model"), false, mat4.create());
          gl.uniformMatrix4fv(gl.getUniformLocation(renderComp.program!, "u_view"), false, ctx.viewMatrix);
          gl.uniformMatrix4fv(gl.getUniformLocation(renderComp.program!, "u_proj"), false, ctx.projectionMatrix);

          // === Pass 1: base black orbit ===
          gl.disable(gl.BLEND);
          gl.uniform1f(gl.getUniformLocation(renderComp.program!, "u_segmentCount"), totalVerts);
          gl.uniform1f(gl.getUniformLocation(renderComp.program!, "u_headIndex"), -1.0); // hide color
          gl.uniform1f(gl.getUniformLocation(renderComp.program!, "u_segmentCount"), totalVerts);

          gl.bindVertexArray(renderComp.VAO!);
          gl.drawArrays(gl.LINE_STRIP, 0, totalVerts);

          // === Pass 2: colorful orbit tail ===
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

          gl.uniform1f(gl.getUniformLocation(renderComp.program!, "u_headIndex"), head);
          gl.drawArrays(gl.LINE_STRIP, 0, totalVerts);

          gl.disable(gl.BLEND);


        }
      })
    }
  }

  private initialize(
    entity: Entity,
    orbitComp: OrbitComponent,
    renderComp: OrbitPathRenderComponent
  ) {
    renderComp.program = this.utils.createProgram(
      renderComp.vertSrc,
      renderComp.fragSrc
    );
    const simStart = "2025-06-30T00:00:00Z";
    orbitComp.epochTime = OrbitUtils.calculateEpochTime(simStart);
    orbitComp.meanAnomalyAtEpoch = (orbitComp.meanAnomalyAtEpoch * Math.PI) / 180;
    this.setupRenderPoints(orbitComp, renderComp);
    this.setupVAO(renderComp);
    renderComp.state = COMPONENT_STATE.READY;
    this.registry.addComponent(entity, renderComp);
  }

  private setupRenderPoints(
    orbitComp: OrbitComponent,
    renderComp: OrbitPathRenderComponent
  ) {
    debugger;
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

      const r = a! * (1 - e! * Math.cos(E)) / SETTINGS.DISTANCE_SCALE;

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
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
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

  private updateOrbitTrail(orbitComp: OrbitComponent, renderComp: OrbitPathRenderComponent) {
    // Get current planet angle in orbit
  const { semiMajorAxis: a, eccentricity: e, inclination, longitudeOfAscendingNode: Ωdeg, argumentOfPeriapsis: ωdeg } = orbitComp;

  const segments = renderComp.pathSegmentCount;
  const fullPath: number[] = [];
  // const currentM = orbitComp.meanAnomalyAtTime(); // or pass current time to orbitComp to get current M
  const currentM = Date.now();
  // Solve for current θ
  const currentE = this.solveKepler(currentM, e!);
  const currentθ = 2 * Math.atan2(Math.sqrt(1 + e!) * Math.sin(currentE / 2), Math.sqrt(1 - e!) * Math.cos(currentE / 2));

  // Use θ as midpoint, then trace backwards (tail)
  const trailLength = Math.PI; // 180 deg
  for (let j = 0; j <= segments; j++) {
    const t = j / segments;
    const θ = currentθ - trailLength * t; // go backward from current θ

    const E = 2 * Math.atan(Math.sqrt((1 - e!) / (1 + e!)) * Math.tan(θ / 2));
    const r = a! * (1 - e! * Math.cos(E));

    const Ω = Ωdeg! * Math.PI / 180;
    const ω = ωdeg! * Math.PI / 180;
    const i = inclination! * Math.PI / 180;

    const x = r * (Math.cos(Ω) * Math.cos(θ + ω) - Math.sin(Ω) * Math.sin(θ + ω) * Math.cos(i));
    const y = r * (Math.sin(Ω) * Math.cos(θ + ω) + Math.cos(Ω) * Math.sin(θ + ω) * Math.cos(i));
    const z = r * Math.sin(θ + ω) * Math.sin(i);

    const finalPos = vec3.fromValues(x, y, z);
    const rotX = mat4.create();
    mat4.fromXRotation(rotX, -Math.PI / 2);
    vec3.transformMat4(finalPos, finalPos, rotX);
    fullPath.push(finalPos[0], finalPos[1], finalPos[2]);
  }
  renderComp.pathVertices = fullPath;

  }

}
