import { GLUtils } from "../../../utils/GLUtils";
import { Registry } from "../Registry";
import { RenderContext } from "../../command/IRenderCommands";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { PlanetRenderComponent } from "../components/RenderComponent";
import { COMPONENT_STATE } from "../Component";
import { mat3, mat4, vec2, vec3 } from "gl-matrix";
import { AssetsLoader } from "../../../core/AssetsLoader";

export class PlanetRenderSystem extends System implements IRenderSystem {
  private atmosphereRotation = 0;
  constructor(
    public renderer: Renderer,
    private assetsLoader: AssetsLoader,
    registry: Registry,
    utils: GLUtils,
  ) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    this.atmosphereRotation += (deltaTime / 45000) % 1.0;
    for (const entity of this.registry.getEntitiesWith(
      PlanetRenderComponent,
      ModelComponent
    )) {
      const modelComp = this.registry.getComponent(entity, ModelComponent);
      const renderComp = this.registry.getComponent(
        entity,
        PlanetRenderComponent
      );
      if (
        modelComp.state !== COMPONENT_STATE.READY ||
        !modelComp.isVisible
      ) {
        continue;
      }

      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED)
        this.initialize(renderComp);
      
      const entityName = this.registry.getNameFromEntityID(entity.id)!;
      const texComp = {
        surface: this.assetsLoader.getTexture(`${entityName.toLowerCase()}Surface`),
        normal: this.assetsLoader.getTexture(`${entityName.toLowerCase()}Normal`),
        specular: this.assetsLoader.getTexture(`${entityName.toLowerCase()}Specular`),
        atmosphere: this.assetsLoader.getTexture(`${entityName.toLowerCase()}Atmosphere`),
        night: this.assetsLoader.getTexture(`${entityName.toLowerCase()}Night`)
      };

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.program);
          gl.bindVertexArray(renderComp.VAO);

          const normalMatrix = mat3.create();
          mat3.normalFromMat4(normalMatrix, modelComp.modelMatrix);
          gl.uniformMatrix3fv(
            renderComp.uniformLocations.normalMatrix,
            false,
            normalMatrix
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

          gl.uniformMatrix4fv(
            renderComp.uniformLocations.lightMatrix,
            false,
            ctx.shadowLightMatrix // passed from camera/light system
          );

          // Bind shadow texture:
          gl.activeTexture(gl.TEXTURE5);
          gl.bindTexture(gl.TEXTURE_2D, ctx.shadowMap);
          gl.uniform1i(renderComp.uniformLocations.shadowMap, 5);

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
          gl.uniform1i(
            renderComp.uniformLocations.useNight,
            texComp.night ? 1 : 0
          );

          this.bindTextures(renderComp, texComp);

          gl.enable(gl.CULL_FACE);
          gl.cullFace(gl.FRONT);
          gl.drawElements(
            gl.TRIANGLES,
            renderComp.sphereMesh!.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );
          gl.disable(gl.CULL_FACE);
          gl.bindVertexArray(null);
        }
      });

      if (!renderComp.atmosphereProgram || !texComp.atmosphere) continue;
      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.atmosphereProgram!);
          gl.bindVertexArray(renderComp.VAO);

          const atmosphereModel = mat4.clone(modelComp.modelMatrix);
          mat4.scale(atmosphereModel, atmosphereModel, [1.02, 1.02, 1.02]);

          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_model"),
            false,
            atmosphereModel
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_view"),
            false,
            ctx.viewMatrix
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_proj"),
            false,
            ctx.projectionMatrix
          );
          gl.uniform1f(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_rotation"),
            this.atmosphereRotation
          );
          gl.uniform1f(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_opacity"),
            0.3
          );
          gl.uniform1f(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_time"),
            Date.now() / 1000
          );
          gl.uniform1f(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_fogDensity"),
            0.03
          );

          gl.activeTexture(gl.TEXTURE4);
          gl.bindTexture(gl.TEXTURE_2D, texComp.atmosphere!);
          gl.uniform1i(
            gl.getUniformLocation(
              renderComp.atmosphereProgram!,
              "u_atmosphereTexture"
            ),
            4
          );

          gl.enable(gl.CULL_FACE);
          gl.cullFace(gl.FRONT);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          gl.depthMask(false);

          gl.drawElements(
            gl.TRIANGLES,
            renderComp.sphereMesh!.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );

          gl.depthMask(true);
          gl.disable(gl.BLEND);
          gl.disable(gl.CULL_FACE);

          gl.bindVertexArray(null);
        }
      });
    }
  }

  private initialize(renderComp: PlanetRenderComponent) {
    renderComp.state = COMPONENT_STATE.LOADING;
    this.getUniformLocations(renderComp);
    renderComp.sphereMesh = this.utils.createUVSphere(1, 40, 40);
    this.setupVAO(renderComp);
    renderComp.state = COMPONENT_STATE.READY;
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
    renderComp.uniformLocations.night = gl.getUniformLocation(
      program,
      "u_nightTexture"
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
    renderComp.uniformLocations.useNight = gl.getUniformLocation(
      program,
      "u_useNight"
    );
    renderComp.uniformLocations.atmosphereRotation = gl.getUniformLocation(
      program,
      "u_atmosphereRotation"
    );

    renderComp.uniformLocations.shadowMap = gl.getUniformLocation(program, "u_shadowMap");
    renderComp.uniformLocations.lightMatrix = gl.getUniformLocation(program, "u_lightMatrix");
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
    texComp: { [key: string]: WebGLTexture | undefined }
  ) {
    const gl = this.utils.gl;
    let idx = 0;
    Object.entries(texComp).forEach(([key, value]) => {
      if (value instanceof WebGLTexture) {
        gl.activeTexture(gl.TEXTURE0 + idx);
        gl.bindTexture(gl.TEXTURE_2D, value);
        gl.uniform1i(renderComp.uniformLocations[key], idx);
        idx++;
      }
    });
  }
}
