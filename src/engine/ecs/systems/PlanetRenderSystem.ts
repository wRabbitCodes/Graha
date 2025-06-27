import { GLUtils } from "../../utils/GLUtils";
import { Registry } from "../Registry";
import { RenderContext } from "../../renderer/IRenderCommands";
import { IRenderSystem } from "../../renderer/IRenderSystem";
import { Renderer } from "../../renderer/Renderer";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { PlanetRenderComponent } from "../components/RenderComponent";
import { TextureComponent } from "../components/TextureComponent";
import { COMPONENT_STATE } from "../Component";

export class PlanetRenderSystem extends System implements IRenderSystem {
  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }
  update(deltaTime: number): void {
    for (const entity of this.registry.getEntitiesWith(PlanetRenderComponent)) {
      const modelComp = this.registry.getComponent(entity, ModelComponent);
      const texComp = this.registry.getComponent(
        entity,
        TextureComponent
      );
      const renderComp = this.registry.getComponent(
        entity,
        PlanetRenderComponent
      );
      if (
        texComp.state !== COMPONENT_STATE.READY
      )
        continue;

        debugger;
      // renderComp.state = COMPONENT_STATE.LOADING;
      if (!renderComp.sphereMesh) renderComp.sphereMesh = this.utils.createUVSphere(1, 30, 30);
      // if (!renderComp.VAO) this.setupVAO(renderComp);
      // if(renderComp.state === COMPONENT_STATE.UNINITIALIZED) {
        // renderComp.sphereMesh = this.utils.createUVSphere(1, 30, 30);
      this.getUniformLocations(renderComp);
      if (!renderComp.VAO) this.setupVAO(renderComp);
      // renderComp.state = COMPONENT_STATE.READY;
  

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.program);
          gl.bindVertexArray(renderComp.VAO);
          // Bind Uniforms
          gl.uniformMatrix3fv(
            renderComp.uniformLocations.normalMatrix,
            false,
            modelComp.normalMatrix
          );
          gl.uniformMatrix4fv(
            renderComp.uniformLocations.model,
            false,
            modelComp.modelMatrix
          );
          gl.uniformMatrix4fv(
            renderComp.uniformLocations.view,
            false,
            ctx.viewMatrix
          );
          gl.uniformMatrix4fv(
            renderComp.uniformLocations.projection,
            false,
            ctx.projectionMatrix
          );
          gl.uniform3fv(renderComp.uniformLocations.lightPos, ctx.lightPos);
          gl.uniform3fv(renderComp.uniformLocations.viewPos, ctx.cameraPos);

          gl.uniform1i(
            renderComp.uniformLocations.useNormal,
            texComp.normal ? 1 : 0
          );
          gl.uniform1i(
            renderComp.uniformLocations.useSpecular,
            texComp.specular ? 1 : 0
          );
          gl.uniform1i(
            renderComp.uniformLocations.useAtmosphere,
            texComp.atmosphere ? 1 : 0
          );

          this.bindTextures(renderComp, texComp);
          gl.drawElements(
            gl.TRIANGLES,
            renderComp.sphereMesh!.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );
          gl.bindVertexArray(null);
        },
      });
    }
  }
  private getUniformLocations(renderComp: PlanetRenderComponent) {
    const gl = this.utils.gl;
    const program = renderComp.program!;
    renderComp.uniformLocations.normalMatrix = gl.getUniformLocation(
      program,
      "u_normalMatrix"
    );
    renderComp.uniformLocations.surface = gl.getUniformLocation(
      program,
      "u_surfaceTexture"
    );
    renderComp.uniformLocations.normal = gl.getUniformLocation(
      program,
      "u_normalTexture"
    );
    renderComp.uniformLocations.specular = gl.getUniformLocation(
      program,
      "u_specularTexture"
    );
    renderComp.uniformLocations.atmosphere = gl.getUniformLocation(
      program,
      "u_atmosphereTexture"
    );
    renderComp.uniformLocations.model = gl.getUniformLocation(
      program,
      "u_model"
    );
    renderComp.uniformLocations.view = gl.getUniformLocation(program, "u_view");
    renderComp.uniformLocations.projection = gl.getUniformLocation(
      program,
      "u_proj"
    );
    renderComp.uniformLocations.lightPos = gl.getUniformLocation(
      program,
      "u_lightPos"
    );
    renderComp.uniformLocations.viewPos = gl.getUniformLocation(
      program,
      "u_viewPos"
    );
    renderComp.uniformLocations.useNormal = gl.getUniformLocation(
      program,
      "u_useNormal"
    );
    renderComp.uniformLocations.useSpecular = gl.getUniformLocation(
      program,
      "u_useSpecular"
    );
    renderComp.uniformLocations.useAtmosphere = gl.getUniformLocation(
      program,
      "u_useAtmosphere"
    );
  }

  private setupVAO(renderComp: PlanetRenderComponent) {
    const sphere = renderComp.sphereMesh!;
    const program = renderComp.program!;
    const gl = this.utils.gl;
    const VAO = gl.createVertexArray()!;
    gl.bindVertexArray(VAO);

    const posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    debugger;
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const normalBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
    const normalLoc = gl.getAttribLocation(program, "a_normal");
    gl.enableVertexAttribArray(normalLoc);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    const tangentBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.tangents, gl.STATIC_DRAW);
    const tangentLoc = gl.getAttribLocation(program, "a_tangent");
    gl.enableVertexAttribArray(tangentLoc);
    gl.vertexAttribPointer(tangentLoc, 3, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    renderComp.VAO = VAO;
  }

  private bindTextures(
    renderComp: PlanetRenderComponent,
    texComp: TextureComponent
  ) {
    const gl = this.utils.gl;
    if(texComp.surface) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texComp.surface);
      gl.uniform1i(renderComp.uniformLocations.surface, 0);
    }
    if(texComp.normal) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texComp.normal);
      gl.uniform1i(renderComp.uniformLocations.surface, 1);
    }
    if(texComp.specular) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texComp.specular);
      gl.uniform1i(renderComp.uniformLocations.surface, 2);
    }
    if(texComp.surface) {
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, texComp.surface);
      gl.uniform1i(renderComp.uniformLocations.surface, 3);
    }

    //  Object.entries(texComp).forEach(([key, value]) => {
    //   if (value instanceof WebGLTexture) {
    //     gl.activeTexture(gl.TEXTURE0 + idx);
    //     gl.bindTexture(gl.TEXTURE_2D, value);
    //     gl.uniform1i(renderComp.uniformLocations[key], idx);
    //     idx++;
    //   }
    // });
  }
}
