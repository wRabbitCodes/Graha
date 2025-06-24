import { mat4, vec3 } from "gl-matrix";
import { Entity } from "../models/Entity";
import { OrbitPath } from "../models/OrbitPath";
import { GLUtils } from "../core/GLUtils";

type OrbitData = {
  object: Entity;
  // Keplerian orbital elements:
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  longitudeOfAscendingNode: number;
  argumentOfPeriapsis: number;
  meanAnomalyAtEpoch: number;
  orbitalPeriod: number;
  orbitPath?: OrbitPath; // ✅ visual ellipse
  elapsedDays?: number;
  axialTilt?: number;
  rotationSpeed?: number;
};

export class OrbitSystem {
  private orbits: OrbitData[] = [];
  private readonly DEG2RAD = Math.PI / 180;

  constructor(private gl: WebGL2RenderingContext, private utils: GLUtils) {}

  addOrbit(orbit: OrbitData) {
    orbit.elapsedDays = 0;
    if (!orbit.orbitPath) {
      orbit.orbitPath = new OrbitPath(this.gl, this.utils, {
        semiMajorAxis: orbit.semiMajorAxis,
        eccentricity: orbit.eccentricity,
        inclination: orbit.inclination,
        longitudeOfAscendingNode: orbit.longitudeOfAscendingNode,
        argumentOfPeriapsis: orbit.argumentOfPeriapsis,
      });
    }
    this.orbits.push(orbit);
  }

  update(deltaTime: number) {
    const daysElapsed = deltaTime / 1000 / 60 / 60 / 24; // Convert ms to days

    for (const orbit of this.orbits) {
      orbit.elapsedDays! += daysElapsed;

      // Mean anomaly (degrees)
      const Mdeg =
        (orbit.meanAnomalyAtEpoch +
          360 * (orbit.elapsedDays! / orbit.orbitalPeriod)) %
        360;
      const M = Mdeg * this.DEG2RAD;

      // Solve Kepler's equation for eccentric anomaly E
      const E = this.solveKepler(M, orbit.eccentricity);

      // Compute distance from focus (Sun)
      const r = orbit.semiMajorAxis * (1 - orbit.eccentricity * Math.cos(E));

      // True anomaly θ
      const theta =
        2 *
        Math.atan2(
          Math.sqrt(1 + orbit.eccentricity) * Math.sin(E / 2),
          Math.sqrt(1 - orbit.eccentricity) * Math.cos(E / 2)
        );

      // Orbital parameters
      const i = orbit.inclination * this.DEG2RAD;
      const Ω = orbit.longitudeOfAscendingNode * this.DEG2RAD;
      const ω = orbit.argumentOfPeriapsis * this.DEG2RAD;

      // Position in 3D space
      const x =
        r *
        (Math.cos(Ω) * Math.cos(theta + ω) -
          Math.sin(Ω) * Math.sin(theta + ω) * Math.cos(i));
      const y =
        r *
        (Math.sin(Ω) * Math.cos(theta + ω) +
          Math.cos(Ω) * Math.sin(theta + ω) * Math.cos(i));
      const z = r * Math.sin(theta + ω) * Math.sin(i);

      const finalPos = vec3.fromValues(x, y, z);

      // Rotation matrix: -90° around X-axis
      const rotX = mat4.create();
      mat4.fromXRotation(rotX, -Math.PI / 2);

      vec3.transformMat4(finalPos, finalPos, rotX);
      // Update object's position
      orbit.object.setPosition(finalPos);
    }
  }

  private solveKepler(M: number, e: number): number {
    let E = M;
    for (let i = 0; i < 10; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }

  render(view: mat4, proj: mat4) {
    for (const orbit of this.orbits) {
      orbit.orbitPath?.render(view, proj);
    }
  }
}
