// src/objects/Star.ts
import { vec3, mat4 } from "gl-matrix";
import { Entity } from "./Entity";

export class Star implements Entity {
  protected color: vec3;
  protected intensity: number;
  protected position: vec3;
  protected modelMatrix: mat4;

  constructor(
    position: vec3 = vec3.create(),
    color: vec3 = vec3.fromValues(1, 1, 1),
    intensity: number = 1,
    modelMatrix: mat4 = mat4.create(), 
  ) {
    this.color = color;
    this.intensity = intensity;
    this.position = position;
    this.modelMatrix = modelMatrix;
  }

  update(deltaTime: number) {
    // Default star might have no behavior, or could pulse, flicker, etc.
  }

  render(viewMatrix: mat4, projectionMatrix: mat4) {
    // Typically stars are light sources, may not be visibly rendered here
  }

  getColor(): vec3 {
    return this.color;
  }

  getIntensity(): number {
    return this.intensity;
  }
}
