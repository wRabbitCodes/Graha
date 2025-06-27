import { vec3 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class OrbitComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;

  constructor(
    public semiMajorAxis: number, // a (in scene units, e.g., scaled km)
    public eccentricity: number, // e
    public inclination: number, // i (degrees)
    public longitudeOfAscendingNode: number, // Ω (degrees)
    public argumentOfPeriapsis: number,
    public perihelion = vec3.create(),
    public aphelion = vec3.create(),
    public meanAnomalyAtEpoch: number,
    public orbitalPeriod: number,
    public elapsedDays?: number,
  ) {}
}
