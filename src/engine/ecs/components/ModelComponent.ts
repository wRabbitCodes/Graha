import { mat3, mat4, quat, vec3 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class ModelComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  name?: string;

  // Local-space properties
  position: vec3 = vec3.create(); // local position relative to parent
  scale: vec3 = vec3.fromValues(1, 1, 1);
  tiltAngle: number = 23.44;      // degrees
  siderealDay: number = 1;        // in Earth days
  axis: vec3 = vec3.fromValues(0, 1, 0); // spin axis in local space

  // Quaternions
  tiltQuat: quat = quat.create();       // initial tilt
  spinQuat: quat = quat.create();       // accumulated spin
  rotationQuat: quat = quat.create();   // tilt * spin

  // Matrices
  modelMatrix: mat4 = mat4.create();         // local: rotation * scale * translation
  worldModelMatrix: mat4 = mat4.create();    // global: hierarchy-applied

  boundingBoxScale: number = 3;
}
