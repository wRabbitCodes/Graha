import { mat3, mat4, quat, vec3 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class ModelComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  normalMatrix = mat3.create();
  name?: string;
  scale?: vec3;
  position?: vec3;
  tiltAngle = 23.44;
  rotationPerFrame=0.3;
  axis = vec3.fromValues(0, 1, 0);
  spinQuat = quat.create();
  rotationQuat = quat.create();
  tiltQuat = quat.create();
  modelMatrix = mat4.create();
}
