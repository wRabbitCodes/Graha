import { mat4, vec3 } from "gl-matrix";
import { IComponent } from "../iComponent";

export class PlanetCoreComponent implements IComponent {
  constructor(
    public name: string,
    public position: vec3,
    public scale: vec3,
    public axis: vec3,
    public tiltAngle: number,
    public modelMatrix = mat4.identity(mat4.create()),
  ) {}
}
