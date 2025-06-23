import { vec3 } from "gl-matrix";

export class OrbitSystem {
  constructor(
    private center: vec3, // central body (sun)
    private radius: number, // distance from center
    private speed: number, // radians per second
    private axis: vec3 = vec3.fromValues(0, 1, 0) // orbit axis (default Y)
  ) {}

  getPosition(time: number): vec3 {
    const angle = this.speed * time * 0.001;
    return vec3.fromValues(
      this.center[0] + this.radius * Math.cos(angle),
      this.center[1],
      this.center[2] + this.radius * Math.sin(angle)
    );
  }
}