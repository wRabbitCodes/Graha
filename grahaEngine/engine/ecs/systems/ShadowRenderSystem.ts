import { PlanetRenderComponent } from "../components/RenderComponent";
import { ModelComponent } from "../components/ModelComponent";
import { IRenderSystem } from "../../command/IRenderSystem";
import { RenderContext } from "../../command/IRenderCommands";
import { Registry } from "../Registry";
import { Renderer } from "../../command/Renderer";
import { mat4, vec3 } from "gl-matrix";
import { ShadowMap } from "@/grahaEngine/utils/ShadowMap";
import { GLUtils } from "@/grahaEngine/utils/GLUtils";

export class ShadowRenderSystem implements IRenderSystem {
  constructor(
    private shadowMap: ShadowMap,
    public renderer: Renderer,
    private registry: Registry,
    private utils: GLUtils,
  ) {}

  update(deltaTime: number): void {
    const gl = this.utils.gl;

    // Setup light view-projection matrix from Sun (at origin)
    const lightPos = vec3.fromValues(0, 0, 0);
    const lightTarget = vec3.fromValues(0, 0, 1);
    const lightUp = vec3.fromValues(0, 1, 0);

    const view = mat4.lookAt(mat4.create(), lightPos, lightTarget, lightUp);
    const proj = mat4.ortho(mat4.create(), -8000, 8000, -8000, 8000, 0.1, 30000);
    mat4.multiply(this.shadowMap.lightViewProj, proj, view);

    this.shadowMap.bindForWriting();


    const entities = this.registry.getEntitiesWith(PlanetRenderComponent, ModelComponent);

    for (const entity of entities) {
      const renderComp = this.registry.getComponent(entity, PlanetRenderComponent);
      const modelComp = this.registry.getComponent(entity, ModelComponent);
      const mesh = renderComp.sphereMesh;

      if (
        !renderComp ||
        !modelComp ||
        !mesh ||
        !renderComp.VAO ||
        !renderComp.shadowProgram
      ) continue;

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.shadowProgram!);
          gl.bindVertexArray(renderComp.VAO);

          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.shadowProgram!, "u_model"),
            false,
            modelComp.modelMatrix
          );

          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.shadowProgram!, "u_lightViewProj"),
            false,
            this.shadowMap.lightViewProj
          );

          gl.drawElements(
            gl.TRIANGLES,
            mesh.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );

          gl.bindVertexArray(null);
          gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); // <-- RESTORE!
        }
      });
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
