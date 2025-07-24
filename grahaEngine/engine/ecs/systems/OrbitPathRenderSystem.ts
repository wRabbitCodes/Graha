import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { OrbitAnomalyCalculator } from "@/grahaEngine/utils/OrbitAnamolyCalculator";
import { mat4, vec3 } from "gl-matrix";
import { RenderContext } from "../../command/IRenderCommands";
import { Renderer, RenderPass } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { ModelComponent } from "../components/ModelComponent";
import { OrbitComponent } from "../components/OrbitComponent";
import { OrbitPathRenderComponent } from "../components/RenderComponent";
import { Entity } from "../Entity";
import { Registry } from "../Registry";
import { System } from "../System";

export class OrbitPathRenderSystem extends System {
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

      const modelComp = this.registry.getComponent(entity, ModelComponent);
      if (modelComp.state !== COMPONENT_STATE.READY) continue;

      let renderComp = this.registry.getComponent(
        entity,
        OrbitPathRenderComponent
      );
      if (!renderComp) {
        renderComp = new OrbitPathRenderComponent();
        this.registry.addComponent(entity, renderComp);
      }
      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED)
        this.initialize(entity, renderComp, orbitComp);
      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      // if (modelComp?.type === ENTITY_TYPE.MOON) {
      //   const moonComp = this.registry.getComponent(entity, MoonComponent);
      //   const parentModel = this.registry.getComponent(
      //     moonComp.parentEntity!,
      //     ModelComponent
      //   );
      //   if (parentModel.state !== COMPONENT_STATE.READY) continue;

      //   orbitComp.scaledPathPoints = this.translateOrbitPathPoints(
      //     orbitComp.pathPoints,
      //     parentModel.position!
      //   );
      //   this.updateVAOForMoon(renderComp, orbitComp);
      // }

      const now = performance.now() / 1000;
      const totalVerts = orbitComp.pathPoints.length / 3;
      const speed = 50.0;
      const pulseLength = totalVerts * 0.3;
      const pulseStart = (now * speed) % totalVerts;
      const pulseEnd = (pulseStart + pulseLength) % totalVerts;

      const planetTheta = OrbitAnomalyCalculator.trueAnomalyAtTime(
        now,
        orbitComp
      );

      // Glowing pass
      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.program);

          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.program!, "u_model"),
            false,
            mat4.create()
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.program!, "u_view"),
            false,
            ctx.viewMatrix
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.program!, "u_proj"),
            false,
            ctx.projectionMatrix
          );

          const loc = (name: string) =>
            gl.getUniformLocation(renderComp.program!, name);

          gl.uniform1f(loc("u_totalVerts"), totalVerts);
          gl.uniform1f(loc("u_pulseStart"), pulseStart);
          gl.uniform1f(loc("u_pulseEnd"), pulseEnd);

          gl.bindVertexArray(renderComp.VAO);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE);
          gl.drawArrays(gl.LINE_STRIP, 0, totalVerts);
          gl.disable(gl.BLEND);
          gl.bindVertexArray(null);
        },
        validate: (gl: WebGL2RenderingContext) => {
          return !!renderComp.program && !!renderComp.VAO && gl.getProgramParameter(renderComp.program!, gl.LINK_STATUS);
        },
        priority: RenderPass.TRANSPARENT,
        shaderProgram: renderComp.program,
        persistent: false,
      });
    }
  }

  private initialize(
    entity: Entity,
    renderComp: OrbitPathRenderComponent,
    orbitComp: OrbitComponent
  ) {
    renderComp.program = this.utils.createProgram(
      renderComp.vertSrc,
      renderComp.fragSrc
    );
    this.setupVAO(renderComp, orbitComp);
    renderComp.state = COMPONENT_STATE.READY;
    this.registry.addComponent(entity, renderComp);
  }

  private setupVAO(
    renderComp: OrbitPathRenderComponent,
    orbitComp: OrbitComponent
  ) {
    const vertices = new Float32Array(orbitComp.pathPoints);
    const gl = this.utils.gl;
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const indexData = new Float32Array(vertices.length / 3);
    for (let i = 0; i < indexData.length; i++) indexData[i] = i;

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    renderComp.VAO = vao;
    renderComp.VBO = vbo;
  }

  private updateVAOForMoon(renderComp: OrbitPathRenderComponent, orbitComp: OrbitComponent) {
    const gl = this.utils.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, renderComp.VBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(orbitComp.pathPoints), gl.DYNAMIC_DRAW);
  }

  private translateOrbitPathPoints(pathPoints: number[], parentPos: vec3) {
    const translated: number[] = [];
    for (let i = 0; i < pathPoints.length; i += 3) {
      translated.push(
        pathPoints[i] + parentPos[0],
        pathPoints[i + 1] + parentPos[1],
        pathPoints[i + 2] + parentPos[2]
      );
    }
    return translated;
  }
}