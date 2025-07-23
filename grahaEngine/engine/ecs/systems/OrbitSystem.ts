import { mat4, vec3 } from "gl-matrix";
import { SETTINGS } from "../../../config/settings";
import { OrbitAnomalyCalculator } from "../../../utils/OrbitAnamolyCalculator";
import { COMPONENT_STATE } from "../Component";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { OrbitComponent } from "../components/OrbitComponent";
import { MoonComponent } from "../components/MoonComponent";
import { Entity } from "../Entity";
import dayjs, { Dayjs } from "dayjs";
import { Registry } from "../Registry";
import { GLUtils } from "@/grahaEngine/utils/GLUtils";

export class OrbitSystem extends System {
  private readonly rotX = mat4.fromXRotation(mat4.create(), -Math.PI / 2);
  private simStart: Dayjs = dayjs();
  private epoch: Dayjs = dayjs("2000-01-01T12:00:00Z");
  private simulationDays = 0;
  private needsReset = false;

  constructor(registry: Registry, utils: GLUtils ) {
    super(registry, utils);
    this.simulationDays = this.simStart.diff(this.epoch, 'day');
  }

  setSimStart(date: Dayjs): void {
    this.simStart = date;
    this.needsReset = true;
  }

  getSimStart(): Dayjs {
    return this.simStart;
  }

  setEpoch(date: Dayjs): void {
    this.epoch = date;
    this.needsReset = true;
  }

  getEpoch(): Dayjs {
    return this.epoch;
  }

  resetSimulationDays(): void {
    this.simulationDays = this.simStart.diff(this.epoch, 'day');
  }

  update(deltaTime: number): void {
    this.simulationDays += deltaTime / 1000 / 86400;

    const entities = this.registry.getEntitiesWith(OrbitComponent, ModelComponent);
    const planets: Entity[] = [];
    const moons: Entity[] = [];

    for (const e of entities) {
      if (this.registry.hasComponent(e, MoonComponent)) moons.push(e);
      else planets.push(e);
    }

    planets.forEach((e) => this.updateEntity(e));
    moons.forEach((e) => this.updateEntity(e));
  }

  private updateEntity(entity: Entity): void {
    const orbit = this.registry.getComponent(entity, OrbitComponent)!;
    const model = this.registry.getComponent(entity, ModelComponent)!;
    if (model.state !== COMPONENT_STATE.READY) return;

    if (this.needsReset || orbit.state === COMPONENT_STATE.UNINITIALIZED) {
      this.initializeOrbit(orbit);
    }

    const pos = OrbitAnomalyCalculator.keplerToCartesian({
      semiMajorAxis: orbit.semiMajorAxis!,
      eccentricity: orbit.eccentricity!,
      inclination: orbit.inclination!,
      ascendingNode: orbit.longitudeOfAscendingNode!,
      argumentOfPeriapsis: orbit.argumentOfPeriapsis!,
      meanAnomaly: OrbitAnomalyCalculator.meanAnomalyAtTime(this.simulationDays, orbit),
    });

    vec3.scale(pos, pos, 1 / (SETTINGS.DISTANCE_SCALE ?? 1));
    vec3.transformMat4(pos, pos, this.rotX);

    const moon = this.registry.getComponent(entity, MoonComponent);
    if (moon) {
      const parent = this.registry.getComponent(moon.parentEntity!, ModelComponent)!;
      vec3.add(model.position!, pos, parent.position!);
    } else {
      model.position = pos;
    }
  }

  private initializeOrbit(orbit: OrbitComponent): void {
    const meanMotion = 360 / orbit.orbitalPeriod!;
    orbit.meanAnomalyAtEpoch = (orbit.meanAnomalyAtEpoch + meanMotion * this.simulationDays) % 360;
    orbit.epochTime = OrbitAnomalyCalculator.calculateEpochTime(this.simStart);

    orbit.pathPoints = this.generateOrbitPathPoints(orbit);
    orbit.scaledPathPoints = [];
    orbit.state = COMPONENT_STATE.READY;
    this.needsReset = false;
  }

  private generateOrbitPathPoints(orbit: OrbitComponent): number[] {
    const points: number[] = [];
    const segments = orbit.pathSegmentCount;

    for (let i = 0; i <= segments; i++) {
      const meanAnomaly = (i / segments) * 360;
      const pos = OrbitAnomalyCalculator.keplerToCartesian({
        semiMajorAxis: orbit.semiMajorAxis!,
        eccentricity: orbit.eccentricity!,
        inclination: orbit.inclination!,
        ascendingNode: orbit.longitudeOfAscendingNode!,
        argumentOfPeriapsis: orbit.argumentOfPeriapsis!,
        meanAnomaly,
      });

      vec3.scale(pos, pos, 1 / (SETTINGS.DISTANCE_SCALE ?? 1));
      vec3.transformMat4(pos, pos, this.rotX);

      points.push(pos[0], pos[1], pos[2]);
    }

    return points;
  }
}
