import { GLUtils, SphereMesh } from "../../../utils/GLUtils";
import { Registry } from "../Registry";
import { RenderContext } from "../../command/IRenderCommands.new";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer.new";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { PlanetRenderComponent } from "../components/RenderComponent";
import { COMPONENT_STATE } from "../Component";
import { mat3, mat4 } from "gl-matrix";
import { AssetsLoader } from "../../../core/AssetsLoader";
import { ShaderLoader } from "@/grahaEngine/engine/shaders/shaderLoader";
import { AtmospherePlanetShaderStrategy } from "@/grahaEngine/engine/shaders/strategies/atmospherePlanetStrategy";
import { BasePlanetShaderStrategy } from "@/grahaEngine/engine/shaders/strategies/basePlanetStrategy";
import { BaseShaderStrategy } from "@/grahaEngine/engine/shaders/strategies/shaderStrategy";
import { Entity } from "../Entity";
import { IRenderCommand } from "../../command/IRenderCommands.new";

export class EntityRenderSystem extends System {

  private basePlanetShaderStrategy: BasePlanetShaderStrategy;
  private atmosphereShaderStrategy: AtmospherePlanetShaderStrategy;
  private sharedVAO: WebGLVertexArrayObject | null = null;
  private sharedMesh: SphereMesh | null = null;
  private buffers: { position: WebGLBuffer; normal: WebGLBuffer; uv: WebGLBuffer; tangent: WebGLBuffer; index: WebGLBuffer } | null = null;
  private atmosphereRotation = 0;
  constructor(
    public renderer: Renderer,
    private assetsLoader: AssetsLoader,
    private shaderLoader: ShaderLoader,
    registry: Registry,
    utils: GLUtils,
  ) {
    super(registry, utils);
    this.initializeShaderStrategies();
    this.initializeSharedResources();
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
        this.initialize(entity, renderComp);

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
          // gl.useProgram(renderComp.program);
          // gl.bindVertexArray(renderComp.VAO);

          const normalMatrix = mat3.create();
          mat3.normalFromMat4(normalMatrix, modelComp.modelMatrix);
          this.basePlanetShaderStrategy.setBindings(gl,ctx, {modelComp, renderComp}, texComp)

          // gl.enable(gl.CULL_FACE);
          // gl.cullFace(gl.FRONT);
          gl.drawElements(
            gl.TRIANGLES,
            renderComp.sphereMesh!.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );
          // gl.disable(gl.CULL_FACE);
          // gl.bindVertexArray(null);
        },
        validate: (gl: WebGL2RenderingContext)=>true,
        persistent: false,
        priority: 0,
        shaderProgram: this.basePlanetShaderStrategy.getProgram()
      });

      //   if (!renderComp.atmosphereProgram || !texComp.atmosphere) continue;
      //   this.renderer.enqueue({
      //     execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
      //       gl.useProgram(renderComp.atmosphereProgram!);
      //       gl.bindVertexArray(renderComp.VAO);

      //       const atmosphereModel = mat4.clone(modelComp.modelMatrix);
      //       mat4.scale(atmosphereModel, atmosphereModel, [1.02, 1.02, 1.02]);

      //       gl.uniformMatrix4fv(
      //         gl.getUniformLocation(renderComp.atmosphereProgram!, "u_model"),
      //         false,
      //         atmosphereModel
      //       );
      //       gl.uniformMatrix4fv(
      //         gl.getUniformLocation(renderComp.atmosphereProgram!, "u_view"),
      //         false,
      //         ctx.viewMatrix
      //       );
      //       gl.uniformMatrix4fv(
      //         gl.getUniformLocation(renderComp.atmosphereProgram!, "u_proj"),
      //         false,
      //         ctx.projectionMatrix
      //       );
      //       gl.uniform1f(
      //         gl.getUniformLocation(renderComp.atmosphereProgram!, "u_rotation"),
      //         this.atmosphereRotation
      //       );
      //       gl.uniform1f(
      //         gl.getUniformLocation(renderComp.atmosphereProgram!, "u_opacity"),
      //         0.3
      //       );
      //       gl.uniform1f(
      //         gl.getUniformLocation(renderComp.atmosphereProgram!, "u_time"),
      //         Date.now() / 1000
      //       );
      //       gl.uniform1f(
      //         gl.getUniformLocation(renderComp.atmosphereProgram!, "u_fogDensity"),
      //         0.03
      //       );

      //       gl.activeTexture(gl.TEXTURE4);
      //       gl.bindTexture(gl.TEXTURE_2D, texComp.atmosphere!);
      //       gl.uniform1i(
      //         gl.getUniformLocation(
      //           renderComp.atmosphereProgram!,
      //           "u_atmosphereTexture"
      //         ),
      //         4
      //       );

      //       gl.enable(gl.CULL_FACE);
      //       gl.cullFace(gl.FRONT);
      //       gl.enable(gl.BLEND);
      //       gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      //       gl.depthMask(false);

      //       gl.drawElements(
      //         gl.TRIANGLES,
      //         renderComp.sphereMesh!.indices.length,
      //         gl.UNSIGNED_SHORT,
      //         0
      //       );

      //       gl.depthMask(true);
      //       gl.disable(gl.BLEND);
      //       gl.disable(gl.CULL_FACE);

      //       gl.bindVertexArray(null);
      //     }
      //   });
      // }
    }
  }

  private initialize(entity: Entity, component: PlanetRenderComponent) {

    const entityName = this.registry.getNameFromEntityID(entity.id)
    // const hasAtmosphere = !!this.assetsLoader.getTexture(`${entityName.toLowerCase()}Atmosphere`);


    component.state = COMPONENT_STATE.LOADING;
    component.sphereMesh = this.sharedMesh!;
    component.VAO = this.sharedVAO!;
    // Choose shader strategy based on entity
    component.basePlanetShaderStrategy = this.basePlanetShaderStrategy;
    component.basePlanetShaderStrategy.initialize();
    component.atmosphereStrategy = this.shaderStrategies.get('atmosphere')!;
    component.program = component.basePlanetShaderStrategy.getProgram();
    component.state = COMPONENT_STATE.READY;
  }

  private initializeShaderStrategies() {
    this.basePlanetShaderStrategy = new BasePlanetShaderStrategy(this.shaderLoader, this.utils);
    this.atmosphereShaderStrategy = new AtmospherePlanetShaderStrategy(this.shaderLoader, this.utils);
  }

  private initializeSharedResources() {
    const gl = this.utils.gl;
    this.sharedMesh = this.utils.createUVSphere(1, 40, 40);
    this.sharedVAO = this.utils.gl.createVertexArray()!;

    this.buffers = {
          position: this.utils.gl.createBuffer()!,
          normal: this.utils.gl.createBuffer()!,
          uv: this.utils.gl.createBuffer()!,
          tangent: this.utils.gl.createBuffer()!,
          index: this.utils.gl.createBuffer()!,
      };

      const sphere = this.sharedMesh!;
      gl.bindVertexArray(this.sharedVAO);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
      gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
      gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uv);
      gl.bufferData(gl.ARRAY_BUFFER, sphere.uvs, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.tangent);
      gl.bufferData(gl.ARRAY_BUFFER, sphere.tangents, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0);
  
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);
  
      gl.bindVertexArray(null);
  }

}