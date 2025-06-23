import { vec3, mat4, quat } from "gl-matrix";

export interface Entity {
  update(deltaTime: number): void;
  render(viewMatrix: mat4, projectionMatrix: mat4, lightPos: vec3, cameraPos: vec3): void;
  getName(): string;
  getPosition(): vec3;
}
