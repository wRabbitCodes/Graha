// src/objects/Star.ts
import { vec3, mat4 } from "gl-matrix";
import { Entity } from "./Entity";
import { GLUtils } from "../core/GLUtils";

export class Star implements Entity {
  protected position: vec3;
  protected scale: vec3;
  protected color: vec3;
  protected radius: number;

  constructor(
    protected name: string,
    protected gl: WebGL2RenderingContext,
    protected utils: GLUtils,
    position: vec3,
    scale: vec3 = vec3.fromValues(2, 2, 2),
    color: vec3 = vec3.fromValues(1.0, 0.9, 0.6)
  ) {
    this.position = position;
    this.scale = scale;
    this.color = color;
    this.radius = Math.max(...scale);
  }
  
  getName(): string {
    return this.name;
  }

  update(_dt: number) {}

  render(_view: mat4, _proj: mat4): void {
    // Optional for now - stars are light sources, visualized via skybox glow or particles later
  }

  getLightPosition(): vec3 {
    return this.position;
  }
}

