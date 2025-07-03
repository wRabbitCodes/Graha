import { mat4 } from "gl-matrix";
import { RenderContext } from "../../command/IRenderCommands";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { GLUtils } from "../../../utils/GLUtils";
import { COMPONENT_STATE } from "../Component";
import { EntitySelectionComponent } from "../components/EntitySelectionComponent";
import {
  PlanetRenderComponent,
  SelectionGlowRenderComponent,
} from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";

export class SelectionGlowRenderSystem extends System implements IRenderSystem {
  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }

  update(deltaTime: number) {
    for (const entity of this.registry.getEntitiesWith(
      EntitySelectionComponent,
    )) {
      const selectionComp = this.registry.getComponent(
        entity,
        EntitySelectionComponent
      );
      if (
        selectionComp?.state !== COMPONENT_STATE.READY ||
        !selectionComp?.isSelected
      ) {
        this.registry.removeComponent(entity, SelectionGlowRenderComponent);
        continue;
      }

      let renderComp = this.registry.getComponent(
        entity,
        SelectionGlowRenderComponent
      );
      if (!renderComp) {
        renderComp = new SelectionGlowRenderComponent();
        this.registry.addComponent(entity, renderComp);
      }
      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED)
        this.initialize(renderComp);
      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      const entityRenderComp = this.registry.getComponent(
        entity,
        PlanetRenderComponent
      );
      if (entityRenderComp.state !== COMPONENT_STATE.READY) continue;
      const entityModelComp = this.registry.getComponent(
        entity,
        ModelComponent
      );
      if (entityModelComp.state !== COMPONENT_STATE.READY) continue;

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.program);
          gl.bindVertexArray(entityRenderComp.VAO);

          const glowModel = mat4.clone(entityModelComp.worldModelMatrix);
          mat4.scale(glowModel, glowModel, [1.05, 1.05, 1.05]);

          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.program!, "u_model"),
            false,
            glowModel
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
            gl.getUniformLocation(renderComp.program!, "u_cameraPos"),
            ctx.cameraPos
          );

          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

          gl.enable(gl.CULL_FACE);
          gl.cullFace(gl.FRONT); // Backface only for outline
          gl.drawElements(
            gl.TRIANGLES,
            entityRenderComp.sphereMesh?.indices.length!,
            gl.UNSIGNED_SHORT,
            0
          );

          gl.disable(gl.CULL_FACE);
          gl.disable(gl.BLEND);
          gl.bindVertexArray(null);
        },
      });
    }
  }

  private initialize(renderComp: SelectionGlowRenderComponent) {
    renderComp.state = COMPONENT_STATE.LOADING;
    renderComp.program = this.utils.createProgram(
      renderComp.vertShader,
      renderComp.fragShader
    );
    renderComp.state = COMPONENT_STATE.READY;
  }
}
