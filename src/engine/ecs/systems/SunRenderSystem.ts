import { RenderContext } from "../../renderer/IRenderCommands";
import { IRenderSystem } from "../../renderer/IRenderSystem";
import { Renderer } from "../../renderer/Renderer";
import { GLUtils } from "../../utils/GLUtils";
import { SunRenderComponent } from "../components/RenderComponent";
import { TextureComponent } from "../components/TextureComponent";
import { Registry } from "../Registry";
import { System } from "../System";

export class SunRenderSystem extends System implements IRenderSystem {
  constructor(
    public renderer: Renderer,
    registry: Registry,
    utils: GLUtils,
  ) {
    super(registry, utils);
  };
  update(deltaTime: number): void {
    for (const entity of this.registry.getEntitiesWith(SunRenderComponent)) {
      const renderComp = this.registry.getComponent(entity, SunRenderComponent);
      const textureComp = this.registry.getComponent(entity, TextureComponent);
      if (!renderComp.program) continue;
      if (!textureComp.sun) continue;
      if (!renderComp.VAO) this.setupVAO(renderComp);

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.program);

          gl.depthMask(false);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

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
          gl.uniform3f(gl.getUniformLocation(renderComp.program!, "u_worldPos"), 0, 0, 0); // Sun at origin
          gl.uniform1f(gl.getUniformLocation(renderComp.program!, "u_size"), 500.0); // Scale of flare in world units

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, textureComp.sun!);
          gl.uniform1i(gl.getUniformLocation(renderComp.program!, "u_lensflare"), 0);

          gl.bindVertexArray(renderComp.VAO);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          gl.bindVertexArray(null);

          gl.disable(gl.BLEND);
          gl.depthMask(true);
        }
      });
    }
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