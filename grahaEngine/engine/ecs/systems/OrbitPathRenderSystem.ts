import { mat4, vec3 } from "gl-matrix";
import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { Renderer } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { ModelComponent } from "../components/ModelComponent";
import { OrbitComponent } from "../components/OrbitComponent";
import { Entity } from "../Entity";
import { Registry } from "../Registry";
import { System } from "../System";
import { RenderContext } from "../../command/IRenderCommands";
import { RenderPass } from "../../command/Renderer";
import { OrbitSystem } from "./OrbitSystem";
import { OrbitAnomalyCalculator } from "@/grahaEngine/utils/OrbitAnamolyCalculator";
import { OrbitPathRenderComponent } from "../components/RenderComponent";

export class OrbitPathRenderSystem extends System {
  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    for (const entity of this.registry.getEntitiesWith(OrbitComponent, ModelComponent)) {
      const orbitComp = this.registry.getComponent(entity, OrbitComponent);
      if (orbitComp?.state !== COMPONENT_STATE.READY || !orbitComp.pathPoints) continue;

      const modelComp = this.registry.getComponent(entity, ModelComponent);
      if (modelComp?.state !== COMPONENT_STATE.READY || !modelComp.baseColor || !modelComp.position) continue;

      let renderComp = this.registry.getComponent(entity, OrbitPathRenderComponent);
      if (!renderComp) {
        renderComp = new OrbitPathRenderComponent();
        this.registry.addComponent(entity, renderComp);
      }
      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED) {
        this.initialize(entity, renderComp, orbitComp);
      }
      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      const totalVerts = orbitComp.pathPoints.length / 3;
    // Use headPosition to find the closest point index for the trail's head
      const headIndex = this.findClosestPathPointIndex(orbitComp.pathPoints, orbitComp.headposition);

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

          gl.uniform3fv(
            gl.getUniformLocation(renderComp.program!, "u_baseColor"),
            modelComp.baseColor
          );
          gl.uniform1f(
            gl.getUniformLocation(renderComp.program!, "u_totalVerts"),
            totalVerts
          );
          gl.uniform1f(
            gl.getUniformLocation(renderComp.program!, "u_headIndex"),
            headIndex
          );
          gl.uniform3fv(
            gl.getUniformLocation(renderComp.program!, "u_viewDir"),
            vec3.fromValues(0, 0, -1)
          );
          gl.bindVertexArray(renderComp.VAO);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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

  private initialize(entity: Entity, renderComp: OrbitPathRenderComponent, orbitComp: OrbitComponent) {
    renderComp.program = this.utils.createProgram(renderComp.vertSrc, renderComp.fragSrc);
    this.setupVAO(renderComp, orbitComp);
    renderComp.state = COMPONENT_STATE.READY;
    this.registry.addComponent(entity, renderComp);
  }

  private setupVAO(renderComp: OrbitPathRenderComponent, orbitComp: OrbitComponent) {
    const vertices = new Float32Array(orbitComp.pathPoints);
    const gl = this.utils.gl;
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
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

  private getPositionFromPathPoints(pathPoints: number[], progress: number): vec3 {
    const totalVerts = pathPoints.length / 3;
    const floatIndex = progress * totalVerts;
    const index = Math.floor(floatIndex);
    const t = floatIndex - index;

    // Get two consecutive points for interpolation
    const idx1 = (index % totalVerts) * 3;
    const idx2 = ((index + 1) % totalVerts) * 3;

    const p1 = vec3.fromValues(pathPoints[idx1], pathPoints[idx1 + 1], pathPoints[idx1 + 2]);
    const p2 = vec3.fromValues(pathPoints[idx2], pathPoints[idx2 + 1], pathPoints[idx2 + 2]);

    // Linearly interpolate between p1 and p2
    return vec3.lerp(vec3.create(), p1, p2, t);
  }

  // Add this method to the class
private findClosestPathPointIndex(pathPoints: number[], position: vec3): number {
  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < pathPoints.length; i += 3) {
    const point = vec3.fromValues(pathPoints[i], pathPoints[i + 1], pathPoints[i + 2]);
    const distance = vec3.distance(point, position);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i / 3;
    }
  }

  return closestIndex;
}
}

