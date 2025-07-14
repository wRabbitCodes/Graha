import { mat4, vec3 } from "gl-matrix";
import { SETTINGS } from "../../../config/settings";
import { OrbitAnamolyCalculator } from "../../../utils/OrbitAnamolyCalculator";
import { COMPONENT_STATE } from "../Component";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { OrbitComponent } from "../components/OrbitComponent";
import { MoonComponent } from "../components/MoonComponent";
import { Entity } from "../Entity";

// ECS-based OrbitSystem to drive ModelComponent.position from Keplerian elements
export class OrbitSystem extends System {
  private readonly DEG2RAD = Math.PI / 180;
  private readonly rotX = mat4.fromXRotation(mat4.create(), -Math.PI / 2);

  update(deltaTime: number): void {
    const allEntities = this.registry.getEntitiesWith(OrbitComponent, ModelComponent);
    const nonMoonEntities: Entity[] = [];
    const moonEntities: Entity[] = [];

    // Classify into planets and moons
    for (const entity of allEntities) {
      if (this.registry.hasComponent(entity, MoonComponent)) {
        moonEntities.push(entity);
      } else {
        nonMoonEntities.push(entity);
      }
    }

    // Step 1: update planet positions first
    for (const entity of nonMoonEntities) {
      this.updateOrbitEntity(entity);
    }

    // Step 2: now update moons (which depend on planet positions)
    for (const entity of moonEntities) {
      this.updateOrbitEntity(entity);
    }
  }

  private updateOrbitEntity(entity: Entity): void {
    const orbit = this.registry.getComponent(entity, OrbitComponent)!;
    const model = this.registry.getComponent(entity, ModelComponent)!;
    if (model.state !== COMPONENT_STATE.READY) return;

    // Initialize if needed
    if (orbit.state === COMPONENT_STATE.UNINITIALIZED) {
      const simStart = "2025-06-30T00:00:00Z";
      orbit.epochTime = OrbitAnamolyCalculator.calculateEpochTime(simStart);
      orbit.meanAnomalyAtEpoch = orbit.meanAnomalyAtEpoch * this.DEG2RAD;
      orbit.elapsedDays = 0;
      orbit.pathPoints = this.generateOrbitPathPoints(orbit, 180);
      orbit.state = COMPONENT_STATE.READY;
    }

    // Compute position from orbit
    const orbitPosition = this.calculatePositionFromTime(orbit);

    // If moon, offset with parent body's position
    const moon = this.registry.getComponent(entity, MoonComponent);
    if (moon) {
      const parentModel = this.registry.getComponent(moon.parentEntity!, ModelComponent);
      vec3.add(model.position!, orbitPosition, parentModel.position!);
    } else {
      model.position = orbitPosition;
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

    const pos = vec3.fromValues(x, y, z);
    vec3.transformMat4(pos, pos, this.rotX); // flatten orbit into XZ plane
    return pos;
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
