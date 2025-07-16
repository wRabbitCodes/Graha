import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { RenderContext } from "../../command/IRenderCommands";
import { Renderer, RenderPass } from "../../command/Renderer";
import { SelectionGlowStrategy } from "../../strategy/strategies/selectionGlowStrategy";
import { COMPONENT_STATE } from "../Component";
import { EntitySelectionComponent } from "../components/EntitySelectionComponent";
import { ModelComponent } from "../components/ModelComponent";
import { PlanetRenderComponent, SelectionGlowRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";

export class SelectionGlowRenderSystem extends System {
  private selectionGlowStrategy: SelectionGlowStrategy;
  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
    this.selectionGlowStrategy = new SelectionGlowStrategy(utils);
    this.selectionGlowStrategy.initialize();
  }

  update(deltaTime: number) {
    for (const entity of this.registry.getEntitiesWith(
      EntitySelectionComponent
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
          this.selectionGlowStrategy.setBindings(gl, ctx, { renderComp, entityModelComp });
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.enable(gl.CULL_FACE);
          gl.cullFace(gl.FRONT);
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
        validate: (gl: WebGL2RenderingContext) => {
          return !!renderComp.program && !!entityRenderComp.VAO && gl.getProgramParameter(renderComp.program!, gl.LINK_STATUS);
        },
        priority: RenderPass.TRANSPARENT,
        shaderProgram: renderComp.program,
        persistent: false,
      });
    }
  }

  private initialize(renderComp: SelectionGlowRenderComponent) {
    renderComp.state = COMPONENT_STATE.LOADING;
    renderComp.program = this.selectionGlowStrategy.getProgram();
    renderComp.state = COMPONENT_STATE.READY;
  }
}