import { vec3 } from "gl-matrix";
import { COMPONENT_STATE, IState } from "../../iState";
import { IComponent } from "../iComponent";

export class OrbitComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;

  perihelion = vec3.create();
  aphelion = vec3.create();

  constructor(
    public semiMajorAxis: number, // a (in scene units, e.g., scaled km)
    public eccentricity: number, // e
    public inclination: number, // i (degrees)
    public longitudeOfAscendingNode: number, // Ω (degrees)
    public argumentOfPeriapsis: number
  ) {}
}
