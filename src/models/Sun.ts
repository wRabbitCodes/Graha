import { mat4, vec3 } from "gl-matrix";
import { Star } from "./Star";
import { GLUtils } from "../core/GLUtils";

export class Sun extends Star {
  constructor(
    name: string,
    gl: WebGL2RenderingContext,
    utils: GLUtils,
    position: vec3 = vec3.fromValues(0, 0, 0),
    scale: vec3 = vec3.fromValues(5, 5, 5)
  ) {
    super(name, gl, utils, position, scale);
  }

  override render(viewMatrix: mat4, projectionMatrix: mat4) {
    // Optional: render a glowing sphere using additive blend
    // OR skip rendering and treat it only as a light source
  }
}