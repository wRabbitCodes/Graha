import { mat4, vec3 } from "gl-matrix";

export interface IRenderCommand {
  execute(gl: WebGL2RenderingContext, context: RenderContext): void;
  undo?(gl: WebGL2RenderingContext, context: RenderContext): void;
}

export type RenderContext = {
  viewMatrix: mat4;
  projectionMatrix: mat4;
  cameraPos: vec3,
  lightPos: vec3,
  canvasWidth: number,
  canvasHeight: number,
  shadowMap: WebGLTexture;
  shadowLightMatrix: mat4;
}