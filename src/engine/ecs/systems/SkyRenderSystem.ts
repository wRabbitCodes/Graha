import { mat4 } from "gl-matrix";
import { RenderContext } from "../../command/IRenderCommands";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { GLUtils } from "../../../utils/GLUtils";
import { COMPONENT_STATE } from "../Component";
import { SkyRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { AssetsLoader } from "../../../core/AssetsLoader";

export class SkyRenderSystem extends System implements IRenderSystem {
  constructor(
    public renderer: Renderer,
    private assetsLoader: AssetsLoader,
    registry: Registry,
    utils: GLUtils
  ) {
    super(registry, utils);
  }

  update(deltaTime: number) {
    for (const entity of this.registry.getEntitiesWith(SkyRenderComponent)) {
      const renderComp = this.registry.getComponent(entity, SkyRenderComponent);
      if (!renderComp) continue;

      const texture = this.assetsLoader.getTexture("sky") ?? null;

      // Initialize if needed
      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED) {
        this.initialize(renderComp);
      }

      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          const program = renderComp.program!;
          const VAO = renderComp.VAO!;
          const sphereMesh = renderComp.sphereMesh!;

          gl.depthFunc(gl.LEQUAL);
          gl.useProgram(program);

          const viewNoTranslation = mat4.clone(ctx.viewMatrix);
          viewNoTranslation[12] =
            viewNoTranslation[13] =
            viewNoTranslation[14] =
              0;

          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.program!, "u_view"),
            false,
            viewNoTranslation
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.program!, "u_proj"),
            false,
            ctx.projectionMatrix
          );

          gl.activeTexture(gl.TEXTURE0 + 20);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform1i(gl.getUniformLocation(renderComp.program!, "u_texture"), 20);

          gl.bindVertexArray(VAO);
          gl.drawElements(
            gl.TRIANGLES,
            sphereMesh.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );
          gl.bindVertexArray(null);

          gl.depthFunc(gl.LESS);
        },
      });
    }
  }

  private initialize(renderComp: SkyRenderComponent) {
    const gl = this.utils.gl;

    renderComp.state = COMPONENT_STATE.LOADING;
    renderComp.sphereMesh = this.utils.createUVSphere(1, 64, 64, true);

    if (!renderComp.program || !renderComp.sphereMesh)
      return;

    this.setupVAO(renderComp);
    renderComp.state = COMPONENT_STATE.READY;
  }

  private setupVAO(renderComp: SkyRenderComponent) {
    const gl = this.utils.gl;
    const program = renderComp.program!;
    const mesh = renderComp.sphereMesh!;
    const VAO = gl.createVertexArray()!;
    gl.bindVertexArray(VAO);

    const posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    renderComp.VAO = VAO;
  }
}
