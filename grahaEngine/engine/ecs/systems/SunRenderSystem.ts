import { SETTINGS } from "../../../config/settings";
import { AssetsLoader } from "../../../core/AssetsLoader";
import { GLUtils } from "../../../utils/GLUtils";
import { RenderContext } from "../../command/IRenderCommands";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { SunRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";

export class SunRenderSystem extends System implements IRenderSystem {
  constructor(public renderer: Renderer,private assetsLoader: AssetsLoader, registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }
  update(deltaTime: number): void {
    for (const entity of this.registry.getEntitiesWith(SunRenderComponent)) {
      const renderComp = this.registry.getComponent(entity, SunRenderComponent);
      const texture = this.assetsLoader.getTexture("sun");
      if (!texture) return;
      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED)
        this.initialize(renderComp);
      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.program);
          // Set uniforms
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
            gl.getUniformLocation(renderComp.program!, "u_worldPos"),
            ctx.lightPos
          ); // Sun at origin
          gl.uniform1f(
            gl.getUniformLocation(renderComp.program!, "u_size"),
            SETTINGS.SUN_SIZE 
          ); // Scale of flare in world units

          gl.activeTexture(gl.TEXTURE0 + 15);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform1i(
            gl.getUniformLocation(renderComp.program!, "u_lensflare"),
            15
          );

          // gl.disable(gl.DEPTH_TEST);
          gl.depthMask(false);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

          gl.bindVertexArray(renderComp.VAO);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          gl.bindVertexArray(null);

          gl.disable(gl.BLEND);
          gl.depthMask(true);
          // gl.enable(gl.DEPTH_TEST);
        },
      });
    }
  }

  private initialize(renderComp: SunRenderComponent) {
    renderComp.state = COMPONENT_STATE.LOADING;
    this.setupVAO(renderComp);
    renderComp.state = COMPONENT_STATE.READY;
  }

  private setupVAO(renderComp: SunRenderComponent) {
    const gl = this.utils.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(renderComp.program!, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    renderComp.VAO = vao;
  }
}
