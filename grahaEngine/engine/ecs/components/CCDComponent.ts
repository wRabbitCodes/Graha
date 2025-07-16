import { vec3 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export type SphereCollider = {
  center?: vec3; // World-Coordinate Center
  radius?: number;
};
// Camera Collision Detection
export class CCDComponent implements IComponent, IState {
  state = COMPONENT_STATE.READY;
}
