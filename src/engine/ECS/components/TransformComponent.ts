import { COMPONENT_STATE } from "../../iState";
import { IComponent } from "../iComponent";
import { vec3, mat4, quat, mat3 } from "gl-matrix";

export class TransformComponent implements IComponent {
  state = COMPONENT_STATE.UNINITIALIZED;
  position = vec3.create();
  rotationQuat = quat.create();
  tiltQuat = quat.create();
  spinQuat = quat.create();
  scale = vec3.fromValues(1, 1, 1);
  

  getModelMatrix(): mat4 {
    const model = mat4.create();
    const fullRot = quat.multiply(quat.create(), this.tiltQuat, this.spinQuat);
    mat4.fromRotationTranslationScale(
      model,
      fullRot,
      this.position,
      this.scale
    );
    return model;
  }

  getNormalMatrix() {
    const model = this.getModelMatrix();
    const normalMatrix = mat3.create();
    mat3.fromMat4(normalMatrix, model);
    mat3.invert(normalMatrix, normalMatrix);
    mat3.transpose(normalMatrix, normalMatrix);
    return normalMatrix;
  }

  getSpinQuat() {
    return this.spinQuat;
  }
}
