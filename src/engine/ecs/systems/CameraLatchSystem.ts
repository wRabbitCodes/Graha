import { mat4, vec3 } from "gl-matrix";
import { Camera } from "../../../core/Camera";
import { GLUtils } from "../../../utils/GLUtils";
import { COMPONENT_STATE } from "../Component";
import {
  CameraLatchComponent,
  LATCH_STATES,
} from "../components/CameraLatchComponent";
import { EntitySelectionComponent } from "../components/EntitySelectionComponent";
import { ModelComponent } from "../components/ModelComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { IO } from "../../../core/IO";

export class CameraLatchSystem extends System {
  constructor(
    private camera: Camera,
    private input: IO,
    registry: Registry,
    utils: GLUtils
  ) {
    super(registry, utils);
  }
  update(deltaTime: number): void {
    for (const entity of this.registry.getEntitiesWith(
      ModelComponent,
      EntitySelectionComponent
    )) {
      const selectionComp = this.registry.getComponent(
        entity,
        EntitySelectionComponent
      );
      if (selectionComp?.state !== COMPONENT_STATE.READY) continue;
      const modelComp = this.registry.getComponent(entity, ModelComponent);
      if (modelComp.state !== COMPONENT_STATE.READY) continue;

      const scale = vec3.create();
      mat4.getScaling(scale, modelComp.modelMatrix);
      const radius =
        Math.max(scale[0], scale[1], scale[2]) * modelComp.boundingBoxScale;

      if (!selectionComp.isSelected) {
        this.registry.removeComponent(entity, CameraLatchComponent);
        this.camera.disableEntityView();
        continue;
      }
      let latchComp = this.registry.getComponent(entity, CameraLatchComponent);
      if (!latchComp) {
        latchComp = new CameraLatchComponent();
        this.registry.addComponent(entity, latchComp);
      }
      if (latchComp.state === COMPONENT_STATE.UNINITIALIZED) {
        vec3.copy(latchComp.startPosition, this.camera.getPosition()); // store current
        latchComp.elapsed = 0;
        latchComp.transitionTime;
        latchComp.transitionTime = 4;
        latchComp.state = COMPONENT_STATE.READY;
      }
      if (latchComp.state !== COMPONENT_STATE.READY) continue;

      if (latchComp.transitionState === LATCH_STATES.TRANSITIONING) {
        latchComp.elapsed += deltaTime / 1000;
        const linearT = latchComp.elapsed / latchComp.transitionTime;
        const t = this.smoothstep(0, 1, linearT);

        // Smooth LERP
        const newPos = vec3.lerp(
          vec3.create(),
          latchComp.startPosition,
          modelComp.position!,
          t
        );
        this.camera.setPosition(newPos);
        const distance = vec3.distance(modelComp.position!, newPos);
        if (
          distance <=
          Math.max(...modelComp.scale!) * modelComp.boundingBoxScale
        ) {
          latchComp.transitionState = LATCH_STATES.LATCHED;
        }
      }

      if (latchComp.transitionState === LATCH_STATES.LATCHED) {
        this.camera.enableEntityView(modelComp.position!, modelComp.boundingBoxScale!)
      }
    }
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    // Scale, clamp and apply smoothstep formula
    const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return t * t * (3 - 2 * t);
  }

  private clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }
}
