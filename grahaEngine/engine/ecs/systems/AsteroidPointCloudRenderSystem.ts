import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { AsteroidPointCloudComponent } from "../components/AsteroidPointCloudComponent";
import { AsteroidPointCloudRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { RenderContext } from "../../command/IRenderCommands";
import { RenderPass } from "../../command/Renderer";

export class AsteroidPointCloudRenderSystem extends System {
  constructor(
    public renderer: Renderer,
    registry: Registry,
    utils: GLUtils
  ) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    const entities = this.registry.getEntitiesWith(AsteroidPointCloudComponent);

    for (const entity of entities) {
      const cloud = this.registry.getComponent(entity, AsteroidPointCloudComponent);
      let renderComp = this.registry.getComponent(entity, AsteroidPointCloudRenderComponent);
      if (!renderComp) {
        renderComp = new AsteroidPointCloudRenderComponent();
        this.registry.addComponent(entity, renderComp);
      }
      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED)
        this.initialize(renderComp, cloud);

      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      const gl = this.utils.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, renderComp.VBO);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, cloud.positions);

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.program);
          gl.bindVertexArray(renderComp.VAO);

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
          gl.uniform1f(
            gl.getUniformLocation(renderComp.program!, "u_time"),
            deltaTime / 1e3// 🕒 Add this to your `RenderContext`
          );

          gl.drawArrays(gl.POINTS, 0, cloud.positions.length / 3);

          gl.bindVertexArray(null);
        },
        validate: (gl: WebGL2RenderingContext) => {
          return !!renderComp.program && !!renderComp.VAO && gl.getProgramParameter(renderComp.program!, gl.LINK_STATUS);
        },
        priority: RenderPass.OPAQUE,
        shaderProgram: renderComp.program,
        persistent: false,
      });
    }
  }

  private initialize(
    renderComp: AsteroidPointCloudRenderComponent,
    cloud: AsteroidPointCloudComponent
  ) {
    const gl = this.utils.gl;
    renderComp.state = COMPONENT_STATE.LOADING;

    renderComp.program = this.utils.createProgram(
      renderComp.vertShader,
      renderComp.fragShader
    );

    const VAO = gl.createVertexArray();
    const posBuffer = gl.createBuffer();
    gl.bindVertexArray(VAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cloud.positions, gl.DYNAMIC_DRAW);
    const posLoc = gl.getAttribLocation(renderComp.program!, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Add seeds
    const seedBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cloud.seeds, gl.STATIC_DRAW);

    const seedLoc = gl.getAttribLocation(renderComp.program!, "a_seed");
    gl.enableVertexAttribArray(seedLoc);
    gl.vertexAttribPointer(seedLoc, 1, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    renderComp.VAO = VAO;
    renderComp.VBO = posBuffer;
    renderComp.state = COMPONENT_STATE.READY;
  }
}