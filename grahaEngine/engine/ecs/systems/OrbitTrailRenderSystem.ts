import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { mat4, vec3 } from "gl-matrix";
import { RenderContext } from "../../command/IRenderCommands";
import { Renderer, RenderPass } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { OrbitComponent } from "../components/OrbitComponent";
import { OrbitTrailComponent } from "../components/OrbitTrialComponent";
import { Entity } from "../Entity";
import { Registry } from "../Registry";
import { System } from "../System";
import { MoonComponent } from "../components/MoonComponent";
import { ModelComponent } from "../components/ModelComponent";

// Vertex shader for the orbit trail
const vertexShaderSource = `#version 300 es
  precision highp float;

  in vec3 a_position;
  in float a_progress;

  uniform mat4 u_mvpMatrix;
  uniform bool u_isMoon;
  uniform vec3 u_parentPosition;

  out float v_progress;

  void main() {
    vec3 worldPosition = a_position;
    if (u_isMoon) {
      worldPosition += u_parentPosition;
    }

    gl_Position = u_mvpMatrix * vec4(worldPosition, 1.0);
    v_progress = a_progress;
  }`;

// Fragment shader with fading effect
const fragmentShaderSource = `#version 300 es
  precision highp float;

  in float v_progress;
  uniform vec3 u_color;
  uniform float u_headProgress;

  out vec4 outColor;

  void main() {
    // Trail progress is now "behind" the planet's current position
    float trailProgress = mod(u_headProgress - v_progress + 1.0, 1.0);

    float opacity = 0.0;
    if (trailProgress < 0.25) {
      opacity = 1.0;
    } else if (trailProgress < 0.5) {
      opacity = 1.0 - (trailProgress - 0.25) / 0.25;
    } else {
      discard;
    }

    outColor = vec4(u_color, opacity);
  }`;

class OrbitTrailStrategy {
  private program: WebGLProgram | null = null;

  constructor(private utils: GLUtils) { }

  initialize(): void {
    this.program = this.utils.createProgram(vertexShaderSource, fragmentShaderSource);
    if (!this.program) {
      console.error('Failed to create orbit trail program');
    } else {
      console.log('Orbit trail program created successfully');
    }
  }

  getProgram(): WebGLProgram | null {
    return this.program;
  }

  setBindings(gl: WebGL2RenderingContext, ctx: Partial<RenderContext>, components: {
    trailComp: OrbitTrailComponent,
    headProgress: number
  }): void {
    if (!this.program) return;

    const { trailComp, headProgress } = components;
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, ctx.projectionMatrix!, ctx.viewMatrix!);

    const mvpLoc = gl.getUniformLocation(this.program, 'u_mvpMatrix');
    const colorLoc = gl.getUniformLocation(this.program, 'u_color');
    const isMoonLoc = gl.getUniformLocation(this.program, 'u_isMoon');
    const parentPosLoc = gl.getUniformLocation(this.program, 'u_parentPosition');
    const headLoc = gl.getUniformLocation(this.program, 'u_headProgress');

    gl.uniformMatrix4fv(mvpLoc, false, mvpMatrix);
    gl.uniform3fv(colorLoc, trailComp.getColorAsVec3());
    gl.uniform1i(isMoonLoc, trailComp.parentPosition ? 1 : 0);
    gl.uniform3fv(parentPosLoc, trailComp.parentPosition || [0, 0, 0]);
    gl.uniform1f(headLoc, headProgress);
  }
}

export class OrbitTrailRenderSystem extends System {
  private trailStrategy: OrbitTrailStrategy;

  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
    this.trailStrategy = new OrbitTrailStrategy(utils);
    this.trailStrategy.initialize();
  }

  update(deltaTime: number): void {
    const entities = this.registry.getEntitiesWith(OrbitComponent);

    console.log(`Processing ${entities.length} entities with orbit trails`);

    for (const entity of entities) {
      const orbitComp = this.registry.getComponent(entity, OrbitComponent)!;
      let trailComp = this.registry.getComponent(entity, OrbitTrailComponent)!;
      const modelComp = this.registry.getComponent(entity, ModelComponent);
      if (!trailComp) {
        trailComp = new OrbitTrailComponent();
        this.registry.addComponent(entity, trailComp);
      }

      if (trailComp.state === COMPONENT_STATE.UNINITIALIZED) {
        console.log(`Initializing trail for entity ${entity}`);
        this.initializeTrail(entity, trailComp, orbitComp);
        trailComp.color = modelComp.baseColor;
      }

      if (trailComp.state !== COMPONENT_STATE.READY || orbitComp.state !== COMPONENT_STATE.READY) {
        console.warn(`Skipping entity ${entity}: trailComp.state=${trailComp.state}, orbitComp.state=${orbitComp.state}`);
        continue;
      }

      const moonComp = this.registry.getComponent(entity, MoonComponent);
      if (moonComp) {
        const parentComp = this.registry.getComponent(moonComp.parentEntity, ModelComponent);
        trailComp.parentPosition = vec3.clone(parentComp.position);  // store in trailComp
      } else {
        trailComp.parentPosition = undefined;
      }
      // Update trail points and get the actual number of points
      const actualPointCount = trailComp.pointCount;

      this.renderer.enqueue({
        execute: (gl, ctx) => {
          gl.useProgram(trailComp.program);
          gl.bindVertexArray(trailComp.vao);

          this.trailStrategy.setBindings(gl, ctx, {
            trailComp,
            headProgress: orbitComp.headProgress, // ∈ [0, 1]
          });

          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.drawArrays(gl.LINE_STRIP, 0, actualPointCount);
          gl.disable(gl.BLEND);

          gl.bindVertexArray(null);
          gl.useProgram(null);
        },
        validate: (gl) => {
          return !!trailComp.program && !!trailComp.vao &&
            gl.getProgramParameter(trailComp.program!, gl.LINK_STATUS);
        },
        priority: RenderPass.TRANSPARENT,
        shaderProgram: trailComp.program,
        persistent: false,
      });
    }
  }

  private initializeTrail(entity: Entity, trailComp: OrbitTrailComponent, orbitComp: OrbitComponent): void {
    trailComp.state = COMPONENT_STATE.LOADING;
    const gl = this.utils.gl;

    const pathPoints = orbitComp.pathPoints;
    const totalPoints = pathPoints.length / 3;
    trailComp.pointCount = totalPoints;
    trailComp.orbitPoints = pathPoints;

    // Progress values ∈ [0, 1)
    const progresses = new Float32Array(totalPoints);
    for (let i = 0; i < totalPoints; i++) {
      progresses[i] = i / totalPoints;
    }

    const positionData = new Float32Array(pathPoints);

    // Create buffers
    trailComp.vao = gl.createVertexArray()!;
    trailComp.positionBuffer = gl.createBuffer()!;
    trailComp.progressBuffer = gl.createBuffer()!;
    trailComp.program = this.trailStrategy.getProgram();

    gl.bindVertexArray(trailComp.vao);

    // Position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, trailComp.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STATIC_DRAW);
    const positionLoc = gl.getAttribLocation(trailComp.program!, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

    // Progress buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, trailComp.progressBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, progresses, gl.STATIC_DRAW);
    const progressLoc = gl.getAttribLocation(trailComp.program!, 'a_progress');
    gl.enableVertexAttribArray(progressLoc);
    gl.vertexAttribPointer(progressLoc, 1, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    trailComp.state = COMPONENT_STATE.READY;
  }
}