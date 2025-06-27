import { mat3, mat4, quat, vec3 } from "gl-matrix";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { COMPONENT_STATE } from "../Component";

export class ModelUpdateSystem extends System {
  update(deltaTime: number) {
    for (const entity of this.registry.getEntitiesWith(ModelComponent)) {
      const coreComp = this.registry.getComponent(entity, ModelComponent);
      if (coreComp.state === COMPONENT_STATE.UNINITIALIZED) {
        let tiltQuat = quat.create();
        quat.setAxisAngle(
          tiltQuat,
          vec3.fromValues(1, 0, 0),
          (coreComp.tiltAngle * Math.PI) / 180
        );
        coreComp.tiltQuat = tiltQuat;
        coreComp.state = COMPONENT_STATE.READY;
      }
      if (coreComp.state === COMPONENT_STATE.READY) {
        const qRotation = quat.setAxisAngle(
          quat.create(),
          coreComp.axis,
          (coreComp.rotationPerFrame * deltaTime) / 100
        );
        const spinQuat = quat.create();
        const rotationQuat = quat.create();
        const modelMatrix = mat4.create();

        quat.copy(spinQuat, coreComp.spinQuat!);
        quat.copy(rotationQuat, coreComp.rotationQuat!)
        mat4.copy(modelMatrix, coreComp.modelMatrix!)

        quat.multiply(spinQuat, qRotation, spinQuat);
        quat.multiply(
          rotationQuat,
          coreComp.tiltQuat!,
          spinQuat
        );
        mat4.fromRotationTranslationScale(
          modelMatrix,
          rotationQuat,
          coreComp.position!,
          coreComp.scale!
        );
        coreComp.spinQuat = spinQuat;
        coreComp.rotationQuat = rotationQuat;
        coreComp.modelMatrix = modelMatrix;
      }
    }
  }
}
