import { System } from "../System";
import { Registry } from "../Registry";
import { OrbitComponent } from "../components/OrbitComponent";
import { ModelComponent } from "../components/ModelComponent";
import { COMPONENT_STATE } from "../Component";
import { mat4, vec3 } from "gl-matrix";

// An ECS-based OrbitSystem that drives TransformComponent positions from Keplerian data
export class OrbitSystem extends System {
  private readonly DEG2RAD = Math.PI / 180;

  update(deltaTime: number): void {
    const entities = this.registry.getEntitiesWith(OrbitComponent, ModelComponent);

    for (const entity of entities) {
      const orbit = this.registry.getComponent(entity, OrbitComponent)!;
      const model = this.registry.getComponent(entity, ModelComponent)!;
      if (model.state !== COMPONENT_STATE.READY) continue;

      if (orbit.state === COMPONENT_STATE.UNINITIALIZED) {
        orbit.elapsedDays = 0;
        orbit.state = COMPONENT_STATE.READY;
      }
      model.position = this.calcultePosition(deltaTime, orbit);
    }
  }

  private calcultePosition(deltaTime: number, orbit: OrbitComponent) {
    const daysElapsed = deltaTime / 1000 / 60 / 60 / 24; // Convert ms to days

    orbit.elapsedDays! += daysElapsed;

    // Mean anomaly (degrees)
    const Mdeg =
      (orbit.meanAnomalyAtEpoch! +
        360 * (orbit.elapsedDays! / orbit.orbitalPeriod!)) %
      360;
    const M = Mdeg * this.DEG2RAD;

    // Solve Kepler's equation for eccentric anomaly E
    const E = this.solveKepler(M, orbit.eccentricity!);

    // Compute distance from focus (Sun)
    let r = orbit.semiMajorAxis! * (1 - orbit.eccentricity! * Math.cos(E));
    r = r / (orbit?.distanceScale ?? 1);

    // True anomaly θ
    const theta =
      2 *
      Math.atan2(
        Math.sqrt(1 + orbit.eccentricity!) * Math.sin(E / 2),
        Math.sqrt(1 - orbit.eccentricity!) * Math.cos(E / 2)
      );

    // Orbital parameters
    const i = orbit.inclination! * this.DEG2RAD;
    const Ω = orbit.longitudeOfAscendingNode! * this.DEG2RAD;
    const ω = orbit.argumentOfPeriapsis! * this.DEG2RAD;

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
    return finalPos;
  }

  private solveKepler(M: number, e: number): number {
    let E = M;
    for (let i = 0; i < 10; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }
}
