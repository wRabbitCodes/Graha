import { mat4, vec3 } from "gl-matrix";
import { Camera } from "../../../core/Camera";
import { GLUtils } from "../../../utils/GLUtils";
import { COMPONENT_STATE } from "../Component";
import {
  CameraLatchComponent,
  LATCH_STATES,
} from "../components/CameraLatchComponent";
import { ModelComponent } from "../components/ModelComponent";
import { Entity } from "../Entity";
import { Registry } from "../Registry";
import { System } from "../System";

export class CameraLatchSystem extends System {
  private latchedEntity: Entity | null = null;

  constructor(private camera: Camera, registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }

  setLatchEntity(e: Entity) {
    if (this.latchedEntity === e) return; // already latched, no change

    // Clear old latch component if exists
    if (this.latchedEntity) {
      this.registry.removeComponent(this.latchedEntity, CameraLatchComponent);
    }

    this.latchedEntity = e;

    // Add fresh latch component to new entity with reset state
    let latch = this.registry.getComponent(e, CameraLatchComponent);
    if (!latch) {
      latch = new CameraLatchComponent();
      this.registry.addComponent(e, latch);
    } else {
      // Reset internal latch state so transition will run again
      latch.transitionState = LATCH_STATES.REORIENTING;
      latch.state = COMPONENT_STATE.UNINITIALIZED;
      latch.elapsed = 0;
    }
  }

  clearLatch() {
    if (!this.latchedEntity) return;
    this.registry.removeComponent(this.latchedEntity, CameraLatchComponent);
    this.camera.disableLatchMode();
    this.latchedEntity = null;
  }

  update(deltaTime: number): void {
    if (!this.latchedEntity) return;
    const modelComp = this.registry.getComponent(
      this.latchedEntity,
      ModelComponent
    );
    if (modelComp?.state !== COMPONENT_STATE.READY) return;

    let latch = this.registry.getComponent(
      this.latchedEntity,
      CameraLatchComponent
    );

    if (!latch) {
      latch = new CameraLatchComponent();
      this.registry.addComponent(this.latchedEntity, latch);
    }

    switch (latch.transitionState) {
      case LATCH_STATES.REORIENTING:
        this.updateReorientation(latch, modelComp, deltaTime);
        break;

      case LATCH_STATES.TRANSITIONING:
        this.updateTransition(latch, modelComp, deltaTime);
        break;

      case LATCH_STATES.LATCHED:
        latch.state = COMPONENT_STATE.UNINITIALIZED;
        this.camera.updateLatchedTarget(modelComp.position!);
        break;
    }
  }

  private updateReorientation(
    latch: CameraLatchComponent,
    model: ModelComponent,
    deltaTime: number
  ) {
    if (latch.state === COMPONENT_STATE.UNINITIALIZED) {
      latch.state = COMPONENT_STATE.READY;
      latch.elapsed = 0;
      // Cache initial camera front vector (direction)
      latch.startDirection = this.camera.getFront();
    }

    latch.elapsed += deltaTime / 1000;
    const t = this.smoothstep(0, 1, latch.elapsed / latch.transitionTime);

    // Desired direction = vector from camera position to target (normalized)
    const desiredDir = vec3.create();
    vec3.sub(desiredDir, model.position!, this.camera.getPosition());
    vec3.normalize(desiredDir, desiredDir);

    // Interpolate direction vector between start and desired direction
    const interpolatedDir = vec3.create();

    // Use spherical linear interpolation (slerp) for directions (quaternions)
    // We'll convert vectors to quats for slerp, or fallback to linear lerp with normalize:

    // For simplicity: linear lerp + normalize (not perfect but good enough)
    vec3.lerp(interpolatedDir, latch.startDirection!, desiredDir, t);
    vec3.normalize(interpolatedDir, interpolatedDir);

    // Apply interpolated direction to camera
    this.camera.lookInDirection(interpolatedDir);

    if (t >= 1) {
      latch.transitionState = LATCH_STATES.TRANSITIONING;
      latch.state = COMPONENT_STATE.UNINITIALIZED; // reset for position phase
    }
  }

  private updateTransition(
    latch: CameraLatchComponent,
    model: ModelComponent,
    deltaTime: number
  ) {
    if (latch.state === COMPONENT_STATE.UNINITIALIZED) {
      vec3.copy(latch.startPosition, this.camera.getPosition());
      latch.elapsed = 0;
      latch.state = COMPONENT_STATE.READY;
    }

    latch.elapsed += deltaTime / 1000;
    const t = this.smoothstep(0, 1, latch.elapsed / latch.transitionTime);

    const offsetDir = vec3.create();
    vec3.sub(offsetDir, this.camera.getPosition(), model.position!);
    vec3.normalize(offsetDir, offsetDir);

    const r = this.computeRadius(model);
    const targetPosition = vec3.create();
    vec3.scaleAndAdd(targetPosition, model.position!, offsetDir, r);

    const interpolated = vec3.lerp(
      vec3.create(),
      latch.startPosition,
      targetPosition,
      t
    );
    this.camera.setPosition(interpolated);
    this.camera.lookAtTarget(model.position!);

    const distance = vec3.distance(interpolated, model.position!);
    const threshold = r * model.boundingBoxScale * 1.728;

    if (distance <= threshold) {
      this.camera.enableLatchMode(model.position!, r * model.boundingBoxScale);
      latch.transitionState = LATCH_STATES.LATCHED;
    }
  }

  private computeRadius(model: ModelComponent): number {
    const scale = vec3.create();
    mat4.getScaling(scale, model.modelMatrix);
    return Math.max(...scale);
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return t * t * (3 - 2 * t);
  }
}
