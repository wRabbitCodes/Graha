// src/systems/OrbitSystem.ts

import { mat4, vec3 } from "gl-matrix";
import { OrbitPath } from "../models/OrbitPath";
import { Entity } from "../models/Entity";
import { GLUtils } from "../core/GLUtils";

type OrbitData = {
  object: Entity;
  center: vec3;
  radius: number;
  speed: number;
  angle: number;
  path?: OrbitPath;
};

export class OrbitSystem {
  private orbits: OrbitData[] = [];
  private gl: WebGL2RenderingContext;
  private utils: GLUtils;

  constructor(gl: WebGL2RenderingContext, utils: GLUtils) {
    this.gl = gl;
    this.utils = utils;
  }

  addOrbitingObject(
    object: Entity,
    center: vec3,
    radius: number,
    speed: number,
    showPath: boolean = true,
    pathColor: [number, number, number] = [0.6, 0.6, 0.6]
  ) {
    const orbit: OrbitData = {
      object,
      center,
      radius,
      speed,
      angle: 0,
      path: showPath ? new OrbitPath(this.gl, this.utils, radius, pathColor) : undefined
    };
    this.orbits.push(orbit);
  }

  update(deltaTime: number) {
    for (const orbit of this.orbits) {
      orbit.angle += orbit.speed * deltaTime;

      const x = orbit.center[0] + Math.cos(orbit.angle) * orbit.radius;
      const z = orbit.center[2] + Math.sin(orbit.angle) * orbit.radius;
      const newPosition = vec3.fromValues(x, orbit.center[1], z);

      // Must implement setPosition(vec3) in your Entity (e.g., Planet)
      if ((orbit.object as any).setPosition) {
        (orbit.object as any).setPosition(newPosition);
      }
    }
  }

  render(viewMatrix: mat4, projMatrix: mat4) {
    for (const orbit of this.orbits) {
      if (orbit.path) {
        orbit.path.render(viewMatrix, projMatrix);
      }
    }
  }
}
