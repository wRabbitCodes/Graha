import { mat3, mat4, quat, vec3 } from "gl-matrix";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { COMPONENT_STATE } from "../Component";

export class ModelUpdateSystem extends System {
  update(deltaTime: number) {
    for (const entity of this.registry.getEntitiesWith(ModelComponent)) {
      const coreComp = this.registry.getComponent(entity, ModelComponent);
      if (coreComp.state === COMPONENT_STATE.UNINITIALIZED) {
        coreComp.tiltQuat = quat.setAxisAngle(
          coreComp.tiltQuat,
          vec3.fromValues(1, 0, 0),
          (coreComp.tiltAngle * Math.PI) / 180
        );
        coreComp.state = COMPONENT_STATE.READY;
      }
      if (coreComp.state === COMPONENT_STATE.READY) {
        const qRotation = quat.setAxisAngle(
          quat.create(),
          coreComp.axis,
          (coreComp.rotationPerFrame * deltaTime) / 100
        );
        quat.multiply(coreComp.spinQuat, qRotation, coreComp.spinQuat);
        quat.multiply(
          coreComp.rotationQuat,
          coreComp.tiltQuat,
          coreComp.spinQuat
        );
        mat4.fromRotationTranslationScale(
          coreComp.modelMatrix,
          coreComp.rotationQuat,
          coreComp.position!,
          coreComp.scale!
        );
        mat3.normalFromMat4(coreComp.normalMatrix, coreComp.modelMatrix);
      }
    }
  }
}
