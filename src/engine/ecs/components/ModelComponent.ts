import { mat3, mat4, quat, vec3 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class ModelComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  public normalMatrix = mat3.create();
  constructor(
    public name?: string,
    public scale?: vec3,
    public position?: vec3,
    public tiltAngle?: number,
    public rotationPerFrame?: number,
    public axis = vec3.fromValues(0, 1, 0),
    public spinQuat = quat.create(),
    public rotationQuat = quat.create(),
    public tiltQuat = quat.create(),
    public modelMatrix = mat4.identity(mat4.create()),
  ) {}
}
