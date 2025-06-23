import { vec3, mat4, quat } from "gl-matrix";

export interface Entity {
  update(deltaTime: number): void;
  render(viewMatrix: mat4, projectionMatrix: mat4, lightPos: vec3, cameraPos: vec3): void;
  getName(): string;
}

// export abstract class Entity {
//   protected position: vec3 = vec3.create();
//   protected rotation: quat = quat.create();
//   protected scale: vec3 = vec3.fromValues(1, 1, 1);

//   protected modelMatrix: mat4 = mat4.create();

//   constructor(position?: vec3, scale?: vec3) {
//     if (position) vec3.copy(this.position, position);
//     if (scale) vec3.copy(this.scale, scale);
//   }

//   abstract update(deltaTime: number): void;
//   abstract render(viewMatrix: mat4, projectionMatrix: mat4): void;

//   getPosition() {
//     return this.position;
//   }

//   getModelMatrix() {
//     mat4.fromRotationTranslationScale(this.modelMatrix, this.rotation, this.position, this.scale);
//     return this.modelMatrix;
//   }
// }
