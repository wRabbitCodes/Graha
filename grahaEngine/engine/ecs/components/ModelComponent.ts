import { mat3, mat4, quat, vec3 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export enum ENTITY_TYPE {
  PLANET = "PLANET",
  MOON = "MOON",
}
export class ModelComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  name?: string;
  baseColor = "#FFFFFF";
  type = ENTITY_TYPE.PLANET;
  radius?: number;
  position = vec3.fromValues(0,0,0);
  tiltAngle = 23.44;
  siderealDay=1; // hours;
  axis = vec3.fromValues(0, 1, 0);
  spinQuat = quat.create();
  rotationQuat=quat.create();
  tiltQuat=quat.create();
  modelMatrix=mat4.create();
  boundingBoxScale = 2;
  isVisible: boolean = true; // Add inside ModelComponent class
  rotationSpeed?: number; //Degree per ms
}
