import { vec3 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export enum LATCH_STATES {
  REORIENTING = "REORIENTING",
  TRANSITIONING = "TRANSITIONING",
  LATCHED = "LATCHED",

}
export class CameraLatchComponent implements IComponent, IState {
  azimuth: number = 0; // θ (horizontal)
  elevation: number = 0.4;
  state = COMPONENT_STATE.UNINITIALIZED;
  transitionTime = 8; // seconds
  elapsed = 0;
  transitionState = LATCH_STATES.REORIENTING;
  startPosition = vec3.create();
  startDirection?: vec3;  // Add this!
}
