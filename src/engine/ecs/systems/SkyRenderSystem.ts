import { mat4 } from "gl-matrix";
import { RenderContext } from "../../renderer/IRenderCommands";
import { IRenderSystem } from "../../renderer/IRenderSystem";
import { Renderer } from "../../renderer/Renderer";
import { GLUtils } from "../../utils/GLUtils";
import { COMPONENT_STATE } from "../Component";
import { SkyRenderComponent } from "../components/RenderComponent";
import { SkysphereTextureComponent } from "../components/SkysphereTextureComponent";
import { Registry } from "../Registry";
import { System } from "../System";

export class SkyRenderSystem extends System implements IRenderSystem {
  constructor(
    public renderer: Renderer,
    utils: GLUtils,
    registry: Registry
  ) {
    super(registry, utils);
  }
  update(deltaTime: number) {
    for (const entity of this.registry.getEntitiesWith(
      SkysphereTextureComponent
    )) {
      const textureComp = this.registry.getComponent(
        entity,
        SkysphereTextureComponent
      );
      const renderComp = this.registry.getComponent(entity, SkyRenderComponent);

      if (textureComp.state !== COMPONENT_STATE.READY) return;
      renderComp.state = COMPONENT_STATE.LOADING;
      if (!renderComp.program)
        renderComp.program = this.utils.createProgram(``, ``);

      if (!renderComp.sphereMesh) renderComp.sphereMesh = this.utils.createUVSphere(1, 30, 30);
      this.setupVAO(renderComp);

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          const program = renderComp.program!;
          const VAO = renderComp.VAO;
          const sphereMesh = renderComp.sphereMesh;
          if (!program || !VAO || !sphereMesh) return;

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
