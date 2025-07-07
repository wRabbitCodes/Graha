import { System } from "../System";
import { AsteroidComponent } from "../components/AsteroidComponent";
import { Registry } from "../Registry";
import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { AsteroidRenderComponent } from "../components/RenderComponent";
import { RenderContext } from "../../command/IRenderCommands";
import { mat4 } from "gl-matrix";

export class AsteroidRenderSystem extends System implements IRenderSystem {
  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    const gl = this.utils.gl;

    for (const entity of this.registry.getEntitiesWith(AsteroidComponent)) {
      const asteroidComp = this.registry.getComponent(
        entity,
        AsteroidComponent
      );
      if (!asteroidComp) continue;

      let renderComp = this.registry.getComponent(
        entity,
        AsteroidRenderComponent
      );
      if (!renderComp) {
        renderComp = new AsteroidRenderComponent();
        this.registry.addComponent(entity, renderComp);
      }

      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED) {
        renderComp.program = this.utils.createProgram(
          renderComp.vertShader,
          renderComp.fragShader
        );

        if (!asteroidComp.vao) {

          asteroidComp.vao = gl.createVertexArray();
          gl.bindVertexArray(asteroidComp.vao);

          // Positions
          const posBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            asteroidComp.mesh!.positions,
            gl.STATIC_DRAW
          );
          gl.enableVertexAttribArray(0);
          gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

          // Normals (optional)
          if (asteroidComp.mesh!.normals) {
            const normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.bufferData(
              gl.ARRAY_BUFFER,
              asteroidComp.mesh!.normals,
              gl.STATIC_DRAW
            );
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
          }

          // UVs (optional)
          if (asteroidComp.mesh!.uvs) {
            const uvBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
            gl.bufferData(
              gl.ARRAY_BUFFER,
              asteroidComp.mesh!.uvs,
              gl.STATIC_DRAW
            );
            gl.enableVertexAttribArray(2);
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
          }

          // Indices
          if (asteroidComp.mesh!.indices) {
            const indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(
              gl.ELEMENT_ARRAY_BUFFER,
              asteroidComp.mesh!.indices,
              gl.STATIC_DRAW
            );
            asteroidComp.vertexCount = asteroidComp.mesh!.indices.length;
          } else {
            asteroidComp.vertexCount = asteroidComp.mesh!.positions.length / 3;
          }

          gl.bindVertexArray(null);
        }

        renderComp.state = COMPONENT_STATE.READY;
      }

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.program!);

          // === Uniform locations ===
          const uModelLoc = gl.getUniformLocation(
            renderComp.program!,
            "u_model"
          );
          const uViewLoc = gl.getUniformLocation(renderComp.program!, "u_view");
          const uProjLoc = gl.getUniformLocation(renderComp.program!, "u_proj");
          const uLightPosLoc = gl.getUniformLocation(
            renderComp.program!,
            "u_lightPos"
          );
          const uHasTexLoc = gl.getUniformLocation(
            renderComp.program!,
            "u_hasTexture"
          );
          const uSamplerLoc = gl.getUniformLocation(
            renderComp.program!,
            "u_diffuse"
          );

          // === Upload matrices ===
          gl.uniformMatrix4fv(uModelLoc, false, asteroidComp.modelMatrix);
          gl.uniformMatrix4fv(uViewLoc, false, ctx.viewMatrix);
          gl.uniformMatrix4fv(uProjLoc, false, ctx.projectionMatrix);

          // === Upload light position === (e.g., world origin)
          gl.uniform3fv(uLightPosLoc, [0, 0, 0]); // or any dynamic value

          // === Texture ===
          if (asteroidComp.mesh?.texture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, asteroidComp.mesh?.texture);
            gl.uniform1i(uSamplerLoc, 0); // bind to sampler2D u_diffuse
            gl.uniform1i(uHasTexLoc, 1);
          } else {
            gl.uniform1i(uHasTexLoc, 0);
          }

          // === Bind VAO and draw ===
          gl.bindVertexArray(asteroidComp.vao);

          const indexType =
            asteroidComp.mesh!.indices instanceof Uint32Array
              ? gl.UNSIGNED_INT
              : gl.UNSIGNED_SHORT;

          gl.drawElements(gl.TRIANGLES, asteroidComp.vertexCount, indexType, 0);

          gl.bindVertexArray(null);
        },
      });
    }
  }

  // Optionally call each frame if modelMatrix needs updating
  private updateAsteroidModelMatrix(asteroidComp: AsteroidComponent) {
    mat4.fromRotationTranslationScale(
      asteroidComp.modelMatrix,
      asteroidComp.rotation,
      asteroidComp.position,
      asteroidComp.scale
    );
  }
}
