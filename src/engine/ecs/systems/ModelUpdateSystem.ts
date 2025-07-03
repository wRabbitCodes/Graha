import { mat4, quat, vec3 } from "gl-matrix";
import { COMPONENT_STATE } from "../Component";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";

export class ModelUpdateSystem extends System {
  update(deltaTime: number) {
    for (const entity of this.registry.getEntitiesWith(ModelComponent)) {
      const model = this.registry.getComponent(entity, ModelComponent);

      if (model.state === COMPONENT_STATE.UNINITIALIZED) {
        if (!model.tiltQuat || !model.tiltAngle) continue;
        quat.setAxisAngle(
          model.tiltQuat,
          vec3.fromValues(1, 0, 0),
          (model.tiltAngle * Math.PI) / 180
        );
        model.state = COMPONENT_STATE.READY;
      }

      if (model.state === COMPONENT_STATE.READY) {
        if (!model.siderealDay) continue;
        // Compute spin rotation for this frame
        const siderealDayMs = model.siderealDay * 24 * 3600 * 1000;
        const spinSpeedRadPerMs = (2 * Math.PI) / siderealDayMs;
        const angleRad = spinSpeedRadPerMs * deltaTime * 86400;

        const frameSpin = quat.setAxisAngle(
          quat.create(),
          model.axis,
          angleRad
        );
        quat.multiply(model.spinQuat, frameSpin, model.spinQuat);

        // Combined rotation: tilt * spin
        quat.multiply(model.rotationQuat, model.tiltQuat, model.spinQuat);

        // Build local model matrix
        mat4.fromRotationTranslationScale(
          model.modelMatrix,
          model.rotationQuat,
          model.position,
          model.scale
        );
      }
    }
  }
}
