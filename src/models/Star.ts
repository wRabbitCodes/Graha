import { mat4, vec3 } from "gl-matrix";
import { Entity } from "./Entity";
import { GLUtils } from "../utils/GLUtils";

export abstract class Star implements Entity {
  protected modelMatrix = mat4.create();
  protected vao: WebGLVertexArrayObject | null = null;
  protected program: WebGLProgram;
  protected texture: WebGLTexture | null = null;

  protected position: vec3 = vec3.create();
  protected scale: vec3 = vec3.fromValues(1, 1, 1);

  protected indexCount: number = 0;

  constructor(
    protected gl: WebGL2RenderingContext,
    protected utils: GLUtils,
    vertexSrc: string,
    fragmentSrc: string
  ) {
    this.program = this.utils.createProgram(vertexSrc, fragmentSrc);
  }
  setPosition(newPosition: vec3): void {
    return;
  }

  abstract update(dt: number): void;
  abstract render(view: mat4, proj: mat4, cameraPos: vec3): void;
  abstract getPosition(): vec3;
  abstract getName(): string;
}