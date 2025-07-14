import { mat3, mat4, vec3 } from "gl-matrix";

export interface RenderContext {
  viewMatrix: mat4;
  projectionMatrix: mat4;
  cameraPos: vec3;
  lightPos: vec3;
  deltaTime: number;
}

export interface IRenderCommand {
  execute(gl: WebGL2RenderingContext, ctx: RenderContext): void;
  priority: number;
  shaderProgram: WebGLProgram | null;
  persistent: boolean;
}