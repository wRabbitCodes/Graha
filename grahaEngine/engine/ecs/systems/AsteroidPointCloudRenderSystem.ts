import { IRenderSystem } from "../../command/IRenderSystem";
import { System } from "../System";
import { AsteroidPointCloudComponent } from "../components/AsteroidPointCloudComponent";
import { COMPONENT_STATE } from "../Component";
import { RenderContext } from "../../command/IRenderCommands";
import { Renderer } from "../../command/Renderer";
import { GLUtils } from "../../../utils/GLUtils";
import { Registry } from "../Registry";
import { AsteroidPointCloudRenderComponent } from "../components/RenderComponent";

export class AsteroidPointCloudRenderSystem extends System implements IRenderSystem {
  constructor(
    public renderer: Renderer,
    registry: Registry,
    utils: GLUtils
  ) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    const entities = this.registry.getEntitiesWith(
      AsteroidPointCloudComponent,
    );

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

      // Sync latest positions
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

          gl.drawArrays(gl.POINTS, 0, cloud.positions.length / 3);

          gl.bindVertexArray(null);
        }
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
    gl.bindVertexArray(null);

    renderComp.VAO = VAO;
    renderComp.VBO = posBuffer;
    renderComp.state = COMPONENT_STATE.READY;
  }
}
