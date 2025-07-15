import { mat4, vec3 } from "gl-matrix";
import { GLUtils } from "../../../utils/GLUtils";
import { IRenderCommand } from "../../command/IRenderCommands.new";
import { Renderer, RenderPass } from "../../command/Renderer.new";
import { Shaders } from "../../strategy/shaders/shaders";
import { COMPONENT_STATE } from "../Component";
import { ModelComponent } from "../components/ModelComponent";
import { MoonComponent } from "../components/MoonComponent";
import { Entity } from "../Entity";
import { Registry } from "../Registry";
import { System } from "../System";

export class ShadowRenderSystem extends System {
  private program: WebGLProgram | null = null;
  private uniformLocations: { model: WebGLUniformLocation; lightViewProjection: WebGLUniformLocation } | null = null;
  private sharedVAO: WebGLVertexArrayObject | null = null;
  private sharedMesh: { positions: Float32Array; indices: Uint16Array } | null = null;
  private buffers: { position: WebGLBuffer; index: WebGLBuffer } | null = null;
  private lightPos = vec3.fromValues(0, 0, 0); // Sun at origin
  private latchedEntity?: Entity;

  constructor(
    public renderer: Renderer,
    registry: Registry,
    utils: GLUtils,
  ) {
    super(registry, utils);
    this.initializeShader();
    this.initializeSharedResources();
  }

  private initializeShader() {
    this.program = this.utils.createProgram(Shaders.shadow.vert, Shaders.shadow.frag);
    if (!this.program) throw new Error('Shadow shader program not found');
    this.uniformLocations = {
      model: this.utils.gl.getUniformLocation(this.program, "u_model")!,
      lightViewProjection: this.utils.gl.getUniformLocation(this.program, "u_lightViewProjection")!,
    };
  }

  private initializeSharedResources() {
    this.sharedMesh = this.utils.createUVSphere(1, 40, 40);
    this.sharedVAO = this.utils.gl.createVertexArray()!;
    this.buffers = {
      position: this.utils.gl.createBuffer()!,
      index: this.utils.gl.createBuffer()!,
    };

    const gl = this.utils.gl;
    const sphere = this.sharedMesh;
    gl.bindVertexArray(this.sharedVAO);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  setLatchedEntity(entity:Entity) {
    this.latchedEntity = entity;
  }

  update(deltaTime: number): void {
    
    
    if (!this.latchedEntity) return; // Skip if no latched entity

    // Determine planet (latched entity or its parent via MoonComponent)
    const moonComp = this.registry.getComponent(this.latchedEntity, MoonComponent);
    const primeEntity = moonComp ? moonComp.parentEntity: this.latchedEntity;

    const primeModel = this.registry.getComponent(primeEntity, ModelComponent);
    if (!primeModel || primeModel.state !== COMPONENT_STATE.READY || !primeModel.isVisible) return;

    // Check for moons
    const moons = this.registry.getEntitiesWith(MoonComponent);
    const groupEntities = moons
      .filter(moon => {
        const model = this.registry.getComponent(moon, ModelComponent);
        const moonComp = this.registry.getComponent(moon, MoonComponent);
        return (
          model.state === COMPONENT_STATE.READY &&
          model.isVisible &&
          moonComp?.parentEntity === primeEntity
        );
      })
      .concat([primeEntity]); // Include planet itself
    if (groupEntities.length <= 1) return; // Skip if no moons (only planet)

    // Scale and translate to planet's position
    const translation = vec3.negate(vec3.create(), primeModel.position!); // Translate to origin
    const scaleFactor = 1e-9; // Scale meters to manageable units
    const projectionSize = 1e9 * scaleFactor; // ±1e9 m → ±1e0 units
    const lightProjection = mat4.ortho(
      mat4.create(),
      -projectionSize,
      projectionSize,
      -projectionSize,
      projectionSize,
      1e8 * scaleFactor,
      2e9 * scaleFactor
    );
    const lightView = mat4.lookAt(mat4.create(), this.lightPos, primeModel.position!, [0, 1, 0]);
    const lightViewProjection = mat4.multiply(mat4.create(), lightProjection, lightView);

    // Pass scaling parameters to shaders
    this.renderer.setRenderContext({
      lightViewProjection,
      shadowTranslation: translation,
      shadowScale: scaleFactor,
    });

    // Render planet and moons to shadow map
    for (const entity of groupEntities) {
      const modelComp = this.registry.getComponent(entity, ModelComponent);
      const command: IRenderCommand = {
        execute: (gl, ctx) => {
          gl.useProgram(this.program);
          gl.bindVertexArray(this.sharedVAO);
          gl.uniformMatrix4fv(this.uniformLocations!.model, false, modelComp.modelMatrix);
          gl.uniformMatrix4fv(this.uniformLocations!.lightViewProjection, false, ctx.lightViewProjection!);
          gl.drawElements(gl.TRIANGLES, this.sharedMesh!.indices.length, gl.UNSIGNED_SHORT, 0);
          gl.bindVertexArray(null);
        },
        validate: (gl) => !!this.program && !!this.sharedVAO && gl.getProgramParameter(this.program, gl.LINK_STATUS),
        priority: RenderPass.SHADOW,
        shaderProgram: this.program,
        persistent: false,
      };

      this.renderer.enqueue(command);
    }
  }
}