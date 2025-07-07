// AsteroidRenderSystem.ts
import { System } from "../System";
import { Registry } from "../Registry";
import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { AsteroidComponent } from "../components/AsteroidComponent";
import { AsteroidRenderComponent } from "../components/RenderComponent";
import { RenderContext } from "../../command/IRenderCommands";

export class AsteroidRenderSystem extends System implements IRenderSystem {
  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    for (const entity of this.registry.getEntitiesWith(AsteroidComponent)) {
      const asteroidComp = this.registry.getComponent(entity, AsteroidComponent);
      if (asteroidComp?.state !== COMPONENT_STATE.READY) continue;

      let renderComp = this.registry.getComponent(entity, AsteroidRenderComponent);
      if (!renderComp) {
        renderComp = new AsteroidRenderComponent();
        this.registry.addComponent(entity, renderComp);
      }

      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED) {
        this.initialize(renderComp, asteroidComp);
      }

      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.program);
          gl.bindVertexArray(asteroidComp.vao);

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

          const uLightPosLoc = gl.getUniformLocation(renderComp.program!, "u_lightPos");
          gl.uniform3fv(uLightPosLoc, [0, 0, 0]);

          const uHasTexLoc = gl.getUniformLocation(renderComp.program!, "u_hasTexture");
          const uSamplerLoc = gl.getUniformLocation(renderComp.program!, "u_diffuse");

          if (asteroidComp.mesh!.texture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, asteroidComp.mesh!.texture);
            gl.uniform1i(uSamplerLoc, 0);
            gl.uniform1i(uHasTexLoc, 1);
          } else {
            gl.uniform1i(uHasTexLoc, 0);
          }

          const indexType =
            asteroidComp.mesh!.indices instanceof Uint32Array
              ? gl.UNSIGNED_INT
              : gl.UNSIGNED_SHORT;

          gl.drawElementsInstanced(
            gl.TRIANGLES,
            asteroidComp.vertexCount,
            indexType,
            0,
            asteroidComp.instanceCount
          );

          gl.bindVertexArray(null);
        },
      });
    }
  }

  private initialize(renderComp: AsteroidRenderComponent, asteroidComp: AsteroidComponent) {
    const gl = this.utils.gl;

    renderComp.state = COMPONENT_STATE.LOADING;
    renderComp.program = this.utils.createProgram(
      renderComp.vertShader,
      renderComp.fragShader
    );

    asteroidComp.vao = gl.createVertexArray();
    gl.bindVertexArray(asteroidComp.vao);

    // Positions
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, asteroidComp.mesh!.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    // Normals
    if (asteroidComp.mesh!.normals) {
      const normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, asteroidComp.mesh!.normals, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    }

    // UVs
    if (asteroidComp.mesh!.uvs) {
      const uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, asteroidComp.mesh!.uvs, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    }

    // Indices
    if (asteroidComp.mesh!.indices) {
      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, asteroidComp.mesh!.indices, gl.STATIC_DRAW);
      asteroidComp.vertexCount = asteroidComp.mesh!.indices.length;
    } else {
      asteroidComp.vertexCount = asteroidComp.mesh!.positions.length / 3;
    }

    // Instance matrix buffer (setup only once, actual data uploaded separately)
    asteroidComp.instanceVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, asteroidComp.instanceVBO);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      asteroidComp.instanceMatrices,
      gl.DYNAMIC_DRAW
    );

    for (let i = 0; i < 4; i++) {
      const loc = 3 + i;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 64, i * 16);
      gl.vertexAttribDivisor(loc, 1);
    }

    gl.bindVertexArray(null);
    renderComp.state = COMPONENT_STATE.READY;
  }
}
