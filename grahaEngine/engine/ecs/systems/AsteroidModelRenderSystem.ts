import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { RenderContext } from "../../command/IRenderCommands";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { AsteroidModelComponent } from "../components/AsteroidModelComponent";
import { AsteroidModelRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { AssetsLoader } from "@/grahaEngine/core/AssetsLoader";

export class AsteroidModelRenderSystem extends System implements IRenderSystem {
  constructor(
    private assetsLoader: AssetsLoader,
    public renderer: Renderer,
    registry: Registry,
    utils: GLUtils
  ) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    const entities = this.registry.getEntitiesWith(AsteroidModelComponent);

    for (const entity of entities) {
      const cloud = this.registry.getComponent(entity, AsteroidModelComponent);
      let renderComp = this.registry.getComponent(
        entity,
        AsteroidModelRenderComponent
      );
      if (!renderComp) {
        renderComp = new AsteroidModelRenderComponent();
        this.registry.addComponent(entity, renderComp);
      }
      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED)
        this.initialize(renderComp, cloud);

      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      // Update instance positions buffer
      const gl = this.utils.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, renderComp.VBO);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, cloud.positions);

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.program!);
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

          const texLoc = gl.getUniformLocation(
            renderComp.program!,
            "u_diffuse"
          );

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, renderComp.mesh?.texture!); // Use correct texture name
          gl.uniform1i(texLoc, 0); // Tell shader to use texture unit 0

          // Draw instanced
          gl.drawElementsInstanced(
            gl.TRIANGLES,
            renderComp.mesh?.indices?.length!,
            gl.UNSIGNED_SHORT,
            0,
            cloud.instanceCount
          );

          gl.bindVertexArray(null);
        },
      });
    }
  }

  private initialize(
    renderComp: AsteroidModelRenderComponent,
    cloud: AsteroidModelComponent
  ) {
    const gl = this.utils.gl;
    renderComp.state = COMPONENT_STATE.LOADING;
    // renderComp.mesh = this.utils.createLowPolyRock();
    renderComp.mesh = this.assetsLoader.getModel("asteroid1");

    renderComp.program = this.utils.createProgram(
      renderComp.vertShader,
      renderComp.fragShader
    );

    const VAO = gl.createVertexArray();
    gl.bindVertexArray(VAO);
    renderComp.VBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, renderComp.VBO);
    gl.bufferData(gl.ARRAY_BUFFER, cloud.positions, gl.DYNAMIC_DRAW);

    // Vertex positions (location = 0)
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, renderComp.mesh!.positions!, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    // Vertex normals (location = 1)
    const normBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, renderComp.mesh!.normals!, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    // Instance positions (location = 2)
    gl.bindBuffer(gl.ARRAY_BUFFER, renderComp.VBO);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(2, 1); // Advance per instance

    // ---- UVs (location = 3)
    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, renderComp.mesh!.uvs!, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);


    // ---- Scales (location = 4)
    const scaleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cloud.scales, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(4, 1); // Per instance

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, renderComp.mesh!.indices!, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    renderComp.VAO = VAO;
    renderComp.state = COMPONENT_STATE.READY;
  }
}
