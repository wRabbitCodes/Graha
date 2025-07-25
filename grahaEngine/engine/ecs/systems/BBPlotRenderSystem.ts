import { mat4, vec3 } from "gl-matrix";
import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { Renderer, RenderPass } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { EntitySelectionComponent } from "../components/EntitySelectionComponent";
import { ModelComponent } from "../components/ModelComponent";
import { BBPlotRenderComponent, PlanetRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { RenderContext } from "../../command/IRenderCommands";

export class BBPlotRenderSystem extends System {
  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    for (const entity of this.registry.getEntitiesWith(
      ModelComponent,
    )) {

      const modelComp = this.registry.getComponent(entity, ModelComponent);
      if (modelComp?.state !== COMPONENT_STATE.READY) continue;
      const renderComp = this.registry.getComponent(
        entity,
        PlanetRenderComponent
      );
      if (renderComp?.state !== COMPONENT_STATE.READY) continue;
      let bbRenderComp = this.registry.getComponent(
        entity,
        BBPlotRenderComponent
      );
      if (!bbRenderComp) {
        bbRenderComp = new BBPlotRenderComponent();
        this.registry.addComponent(entity, bbRenderComp);
      }
      if (bbRenderComp.state === COMPONENT_STATE.UNINITIALIZED)
        this.initialize(bbRenderComp);
      if (bbRenderComp.state !== COMPONENT_STATE.READY) continue;

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(bbRenderComp.program);
          gl.bindVertexArray(renderComp.VAO);

          const boxModelMatrix = mat4.clone(modelComp.modelMatrix);
          mat4.scale(boxModelMatrix, boxModelMatrix, vec3.fromValues(modelComp.boundingBoxScale!, modelComp.boundingBoxScale!, modelComp.boundingBoxScale!));
          gl.uniformMatrix4fv(
            gl.getUniformLocation(bbRenderComp.program!, "u_model"),
            false,
            boxModelMatrix
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(bbRenderComp.program!, "u_view"),
            false,
            ctx.viewMatrix
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(bbRenderComp.program!, "u_proj"),
            false,
            ctx.projectionMatrix
          );

          gl.drawElements(
            gl.LINES,
            renderComp.sphereMesh?.indices.length!,
            gl.UNSIGNED_SHORT,
            0
          );

          gl.bindVertexArray(null);
        },
        validate: (gl: WebGL2RenderingContext) => {
          return !!bbRenderComp.program && !!renderComp.VAO && gl.getProgramParameter(bbRenderComp.program!, gl.LINK_STATUS);
        },
        priority: RenderPass.TRANSPARENT,
        shaderProgram: bbRenderComp.program,
        persistent: false,
      });
    }
  }

  private initialize(bbRenderComp: BBPlotRenderComponent) {
    bbRenderComp.state = COMPONENT_STATE.LOADING;
    bbRenderComp.program = this.utils.createProgram(
      bbRenderComp.vertexShader,
      bbRenderComp.fragmentShader
    );
    bbRenderComp.state = COMPONENT_STATE.READY;
  }
}