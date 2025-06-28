import { mat4 } from "gl-matrix";
import { RenderContext } from "../../command/IRenderCommands";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { GLUtils } from "../../../utils/GLUtils";
import { COMPONENT_STATE } from "../Component";
import { SkyRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { TextureComponent } from "../components/TextureComponent";

export class SkyRenderSystem extends System implements IRenderSystem {
  constructor(
    public renderer: Renderer,
    registry: Registry,
    utils: GLUtils,
  ) {
    super(registry, utils);
  }
  update(deltaTime: number) {
    for (const entity of this.registry.getEntitiesWith(
      SkyRenderComponent
    )) {
      const textureComp = this.registry.getComponent(
        entity,
        TextureComponent
      );
      const renderComp = this.registry.getComponent(entity, SkyRenderComponent);
      if (!renderComp) continue;
      if (textureComp.state !== COMPONENT_STATE.READY) continue;
      renderComp.state = COMPONENT_STATE.LOADING;

      if (!renderComp.sphereMesh) renderComp.sphereMesh = this.utils.createUVSphere(1, 64, 64, true);
      if (!renderComp.VAO) this.setupVAO(renderComp);

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          const program = renderComp.program!;
          const VAO = renderComp.VAO;
          const sphereMesh = renderComp.sphereMesh;
          if (!program || !VAO || !sphereMesh || !textureComp.skysphere) return;

          gl.depthFunc(gl.LEQUAL);
          gl.useProgram(renderComp.program);

          const viewNoTrans = mat4.clone(ctx.viewMatrix);
          viewNoTrans[12] = viewNoTrans[13] = viewNoTrans[14] = 0;

          gl.uniformMatrix4fv(
            gl.getUniformLocation(program, "u_view"),
            false,
            viewNoTrans
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(program, "u_proj"),
            false,
            ctx.projectionMatrix
          );
          gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, textureComp.skysphere);

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
  private setupVAO(renderComp: SkyRenderComponent) {
    const gl = this.utils.gl;
    const program = renderComp.program!;
    const sphereMesh = renderComp.sphereMesh;
    if (!program || !sphereMesh) return;
    const VAO = gl.createVertexArray();
    gl.bindVertexArray(VAO);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      sphereMesh.positions,
      gl.STATIC_DRAW
    );
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sphereMesh.uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      sphereMesh.indices,
      gl.STATIC_DRAW
    );

    gl.bindVertexArray(null);

    renderComp.VAO = VAO;
  }
}
