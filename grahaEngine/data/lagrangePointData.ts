import { vec3 } from "gl-matrix";
import { SETTINGS } from "../config/settings";

export const AU = 1.496e8; // km (distance from Sun to Earth)
const scale = SETTINGS.DISTANCE_SCALE;
export const scaledLagrangePoints = {
  L1: vec3.fromValues((AU - 1.5e6) / scale, 0, 0),
  L2: vec3.fromValues((AU + 1.5e6) / scale, 0, 0),
  L3: vec3.fromValues((-AU - 2.5e6) / scale, 0, 0),
  L4: vec3.fromValues((AU * Math.cos(Math.PI / 3)) / scale, (AU * Math.sin(Math.PI / 3)) / scale, 0),
  L5: vec3.fromValues((AU * Math.cos(Math.PI / 3)) / scale, -(AU * Math.sin(Math.PI / 3)) / scale, 0),
};
