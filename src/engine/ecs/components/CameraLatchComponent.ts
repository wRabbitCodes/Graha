import { vec3 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export enum LATCH_STATES {
  FREE_LOOK = "FREE_LOOK",
  TRANSITIONING = "TRANSITIONING",
  LATCHED = "LATCHED",
}
export class CameraLatchComponent implements IComponent, IState {
  azimuth: number = 0; // θ (horizontal)
  elevation: number = 0.4;
  state = COMPONENT_STATE.UNINITIALIZED;
  transitionTime = 2; // seconds
  elapsed = 0;
  transitionState = LATCH_STATES.TRANSITIONING;
  startPosition = vec3.create();
}
