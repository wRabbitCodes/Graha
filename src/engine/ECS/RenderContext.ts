import { mat4, vec3 } from "gl-matrix";

export interface RenderContext {
  viewMatrix: mat4;
  projMatrix: mat4;
  cameraPos: vec3;
  lightPos: vec3;
}