import { mat4, mat3, vec3 } from "gl-matrix";

export interface RenderContext {
  viewMatrix: mat4;
  projectionMatrix: mat4;
  cameraPos: vec3;
  lightPos: vec3;
  deltaTime: number;
  canvasHeight: number;
  canvasWidth: number;
  shadowDepthTexture: WebGLTexture; // Shadow map
  lightViewProjection: mat4; // Light's view-projection matrix
}

export interface IRenderCommand {
  execute(gl: WebGL2RenderingContext, context: Partial<RenderContext>): void;
  validate(gl: WebGL2RenderingContext): boolean;
  priority: number;
  shaderProgram: WebGLProgram | null;
  persistent: boolean;
}