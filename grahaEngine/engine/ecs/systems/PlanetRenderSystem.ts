import { GLUtils, SphereMesh } from "../../../utils/GLUtils";
import { Registry } from "../Registry";
import { RenderContext } from "../../command/IRenderCommands";
import { Renderer } from "../../command/Renderer";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { PlanetRenderComponent } from "../components/RenderComponent";
import { COMPONENT_STATE } from "../Component";
import { mat3, mat4 } from "gl-matrix";
import { AssetsLoader } from "../../../core/AssetsLoader";
import { AtmosphereStrategy } from "../../strategy/strategies/atmosphereStrategy";
import { BasePlanetStrategy } from "../../strategy/strategies/basePlanetStrategy";

export class PlanetRenderSystem extends System {

  private basePlanetShaderStrategy!: BasePlanetStrategy;
  private atmosphereShaderStrategy!: AtmosphereStrategy;
  private VAO: WebGLVertexArrayObject | null = null;
  private mesh: SphereMesh | null = null;
  constructor(
    public renderer: Renderer,
    private assetsLoader: AssetsLoader,
    registry: Registry,
    utils: GLUtils,
  ) {
    super(registry, utils);
    this.initializeShaderStrategies();
    this.initializeSharedResources();
  }

  update(deltaTime: number): void {
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
        this.initializeRenderComp(renderComp);

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
          gl.useProgram(renderComp.program!);
          this.basePlanetShaderStrategy.setBindings(gl,ctx, {modelComp, renderComp}, texComp)
          gl.bindVertexArray(renderComp.VAO);
          gl.depthFunc(gl.LEQUAL)
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
        },
      });

      if (!!texComp.atmosphere) {
        this.renderer.enqueue({
          execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {

            gl.useProgram(renderComp.atmosphereProgram!);
            this.atmosphereShaderStrategy.setBindings(gl, ctx, {modelComp}, {atmosphere: texComp.atmosphere!})

            gl.bindVertexArray(this.VAO)
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
          },
        });
      }
    }
  }

  private initializeRenderComp(component: PlanetRenderComponent) {
    component.state = COMPONENT_STATE.LOADING;
    component.sphereMesh = this.mesh!;
    component.VAO = this.VAO!;
    component.program = this.basePlanetShaderStrategy.getProgram();
    component.atmosphereProgram = this.atmosphereShaderStrategy.getProgram();
    component.state = COMPONENT_STATE.READY;
  }

  private initializeShaderStrategies() {
    this.basePlanetShaderStrategy = new BasePlanetStrategy(this.utils);
    this.basePlanetShaderStrategy.initialize();
    this.atmosphereShaderStrategy = new AtmosphereStrategy(this.utils);
    this.atmosphereShaderStrategy.initialize();
  }

  private initializeSharedResources() {
    const gl = this.utils.gl;
    this.mesh = this.utils.createUVSphere(1, 40, 40);
    const sphere = this.mesh;

    this.VAO = this.utils.gl.createVertexArray()!;
    gl.bindVertexArray(this.VAO);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, sphere.uvs, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, sphere.tangents, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

}