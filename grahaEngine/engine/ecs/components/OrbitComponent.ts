import { vec3 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class OrbitComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  semiMajorAxis?: number; // a (in scene units e.g. scaled km)
  eccentricity?: number; // e
  inclination?: number; // i (degrees)
  longitudeOfAscendingNode?: number; // Ω (degrees)
  argumentOfPeriapsis?: number;
  perihelion = vec3.create();
  aphelion = vec3.create();
  meanAnomalyAtEpoch = 0
  epochTime = 0;
  orbitalPeriod?: number;
  elapsedDays?: number;
  pathPoints: number[] = [];
  scaledPathPoints: number[] = [];
}
