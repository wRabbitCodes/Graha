import { mat4, vec3 } from "gl-matrix";
import { SETTINGS } from "../../../config/settings";
import { OrbitAnamolyCalculator } from "../../../utils/OrbitAnamolyCalculator";
import { COMPONENT_STATE } from "../Component";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { OrbitComponent } from "../components/OrbitComponent";

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
        const simStart = "2025-06-30T00:00:00Z";
        orbit.epochTime = OrbitAnamolyCalculator.calculateEpochTime(simStart);
        orbit.meanAnomalyAtEpoch = (orbit.meanAnomalyAtEpoch * Math.PI) / 180;
        orbit.elapsedDays = 0;
        orbit.pathPoints = this.generateOrbitPathPoints(orbit, 180);
        orbit.state = COMPONENT_STATE.READY;
      }
      model.position = this.calculatePositionFromTime(orbit);
      // mat4.fromTranslation(model.modelMatrix, this.calculatePositionFromTime(orbit));
    }
  }

  private calculatePositionFromTime(orbit: OrbitComponent): vec3 {
    const now = performance.now() / 1000; // seconds
    const theta = OrbitAnamolyCalculator.trueAnomalyAtTime(now, orbit);
    return this.positionFromTrueAnomaly(theta, orbit);
  }

  private positionFromTrueAnomaly(theta: number, orbit: OrbitComponent): vec3 {
    const E = 2 * Math.atan(Math.tan(theta / 2) * Math.sqrt((1 - orbit.eccentricity!) / (1 + orbit.eccentricity!)));
    let r = orbit.semiMajorAxis! * (1 - orbit.eccentricity! * Math.cos(E));
    r = r / (SETTINGS.DISTANCE_SCALE ?? 1);

    const i = orbit.inclination! * this.DEG2RAD;
    const Ω = orbit.longitudeOfAscendingNode! * this.DEG2RAD;
    const ω = orbit.argumentOfPeriapsis! * this.DEG2RAD;

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
    const rotX = mat4.create();
    mat4.fromXRotation(rotX, -Math.PI / 2);
    vec3.transformMat4(finalPos, finalPos, rotX);
    return finalPos;
  }

  private generateOrbitPathPoints(orbit: OrbitComponent, segments: number): number[] {
    const points: number[] = [];
    for (let j = 0; j <= segments; j++) {
      const M = (j / segments) * 2 * Math.PI;
      const E = OrbitAnamolyCalculator.solveKepler(M, orbit.eccentricity!);
      const theta = 2 * Math.atan2(
        Math.sqrt(1 + orbit.eccentricity!) * Math.sin(E / 2),
        Math.sqrt(1 - orbit.eccentricity!) * Math.cos(E / 2)
      );
      const pos = this.positionFromTrueAnomaly(theta, orbit);
      points.push(pos[0], pos[1], pos[2]);
    }
    return points;
  }
} 
