import { mat4, vec3 } from "gl-matrix";
import { Camera } from "../../../core/Camera";
import { IO } from "../../../core/IO";
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

export class CameraLatchSystem extends System {
  constructor(
    private camera: Camera,
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
      const selection = this.registry.getComponent(
        entity,
        EntitySelectionComponent
      );
      const model = this.registry.getComponent(entity, ModelComponent);
      if (
        !selection ||
        !model ||
        selection.state !== COMPONENT_STATE.READY ||
        model.state !== COMPONENT_STATE.READY
      )
        continue;

      const radius = this.computeRadius(model);

      // If not selected, clean up and exit
      if (!selection.isSelected) {
        this.registry.removeComponent(entity, CameraLatchComponent);
        this.camera.disableLatchMode();
        continue;
      }

      // Ensure latch component exists
      let latch = this.registry.getComponent(entity, CameraLatchComponent);
      if (!latch) {
        latch = new CameraLatchComponent();
        this.registry.addComponent(entity, latch);
      }

      // Initialize if needed
      if (latch.state === COMPONENT_STATE.UNINITIALIZED) {
        vec3.copy(latch.startPosition, this.camera.getPosition());
        latch.elapsed = 0;
        latch.transitionTime = 4;
        latch.state = COMPONENT_STATE.READY;
        latch.transitionState = LATCH_STATES.TRANSITIONING;
      }

      // Transition
      if (latch.transitionState === LATCH_STATES.TRANSITIONING) {
        latch.elapsed += deltaTime / 1000;
        const t = this.smoothstep(0, 1, latch.elapsed / latch.transitionTime);
        const newPos = vec3.lerp(
          vec3.create(),
          latch.startPosition,
          model.position!,
          t
        );
        this.camera.setPosition(newPos);

        const dist = vec3.distance(model.position!, newPos);
        const boundRadius = Math.max(...model.scale!) * model.boundingBoxScale;
        if (dist <= boundRadius) latch.transitionState = LATCH_STATES.LATCHED;
      }

      // Latch
      if (latch.transitionState === LATCH_STATES.LATCHED) {
        this.camera.enableLatchMode(model.position!, radius);
      }
    }
  }

  private computeRadius(model: ModelComponent): number {
    const scale = vec3.create();
    mat4.getScaling(scale, model.modelMatrix);
    return Math.max(...scale) * model.boundingBoxScale;
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return t * t * (3 - 2 * t);
  }
}
