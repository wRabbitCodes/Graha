import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { vec3 } from "gl-matrix";
import { Renderer, RenderPass } from "../../command/Renderer";
import { OrbitTrailStrategy } from "../../strategy/strategies/orbitTrailStrategy";
import { COMPONENT_STATE } from "../Component";
import { ModelComponent } from "../components/ModelComponent";
import { MoonComponent } from "../components/MoonComponent";
import { OrbitComponent } from "../components/OrbitComponent";
import { OrbitTrailComponent } from "../components/OrbitTrialComponent";
import { Entity } from "../Entity";
import { Registry } from "../Registry";
import { System } from "../System";

export class OrbitTrailRenderSystem extends System {
  private trailStrategy: OrbitTrailStrategy;
  shouldRenderMoonOrbits: boolean = true; // HACK: AVOID DRAWING MOON ORBITS AT HIGH SPEED SIMULATION

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
        this.initializeTrail(trailComp, orbitComp);
        trailComp.color = modelComp.baseColor;
      }

      if (trailComp.state !== COMPONENT_STATE.READY || orbitComp.state !== COMPONENT_STATE.READY) {
        console.warn(`Skipping entity ${entity}: trailComp.state=${trailComp.state}, orbitComp.state=${orbitComp.state}`);
        continue;
      }

      const moonComp = this.registry.getComponent(entity, MoonComponent);
      if (moonComp) {
        if (!this.shouldRenderMoonOrbits) continue;
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

  private initializeTrail(trailComp: OrbitTrailComponent, orbitComp: OrbitComponent): void {
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