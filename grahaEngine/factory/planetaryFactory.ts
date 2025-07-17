import { vec3 } from "gl-matrix";
import { Registry } from "../engine/ecs/Registry";
import { ENTITY_TYPE } from "../engine/ecs/components/ModelComponent";
import { OrbitComponent } from "../engine/ecs/components/OrbitComponent";
import { ModelComponent } from "../engine/ecs/components/ModelComponent";
import { MoonComponent } from "../engine/ecs/components/MoonComponent";
import { Entity } from "../engine/ecs/Entity";
import { IFactory } from "./IFactory";
import { SETTINGS } from "../config/settings";

interface PlanetaryConfig {
  type: ENTITY_TYPE;
  name: string;
  radius: number;
  tiltAngle: number;
  siderealDay: number;
  axis?: vec3;
  parent?: Entity;
  orbitData?: Partial<OrbitComponent>;
}

interface PlanetaryData {
  epoch: string;
  bodies: {
    type: ENTITY_TYPE;
    name: string;
    radius: number;
    tiltAngle: number;
    siderealDay: number;
    axis?: [number, number, number];
    parent?: string;
    orbitData?: Partial<OrbitComponent>;
  }[];
}

export class PlanetaryFactory implements IFactory {
  constructor(private registry: Registry) {}

  create(config: PlanetaryConfig): Entity {
    const entity = this.registry.createEntity();
    const model = new ModelComponent();
    
    model.name = config.name;
    model.radius = config.radius / SETTINGS.SIZE_SCALE;
    model.tiltAngle = config.tiltAngle;
    model.siderealDay = config.siderealDay;
    model.axis = config.axis || vec3.fromValues(0, 1, 0);
    model.type = config.type;

    const orbitRadius =(config.orbitData?.semiMajorAxis!)/ SETTINGS.DISTANCE_SCALE;
    model.position = vec3.fromValues(orbitRadius, 0, 0);
    this.registry.addComponent(entity, model);

    if (config.orbitData) {
      const orbit = new OrbitComponent();
      orbit.semiMajorAxis = config.orbitData.semiMajorAxis;
      orbit.eccentricity = config.orbitData.eccentricity;
      orbit.inclination = config.orbitData.inclination;
      orbit.longitudeOfAscendingNode = config.orbitData.longitudeOfAscendingNode;
      orbit.argumentOfPeriapsis = config.orbitData.argumentOfPeriapsis;
      orbit.meanAnomalyAtEpoch = config.orbitData.meanAnomalyAtEpoch!;
      orbit.orbitalPeriod = config.orbitData.orbitalPeriod;
      orbit.perihelion = config.orbitData.perihelion!;
      orbit.aphelion = config.orbitData.aphelion!;
      orbit.pathPoints = [];
      orbit.scaledPathPoints = [];
      this.registry.addComponent(entity, orbit);
    }

    if (config.type === ENTITY_TYPE.MOON && config.parent) {
      const moon = new MoonComponent();
      moon.parentEntity = config.parent;
      this.registry.addComponent(entity, moon);
    }

    return entity;
  }

  reinitializeEntities(data: PlanetaryData | null): void {
    if (!data) {
      console.warn("No planetary data provided. Skipping reinitialization.");
      return;
    }

    // Remove existing planetary entities (except Sun and Sky)
    this.registry.getEntitiesWith(ModelComponent).forEach((entity) => {
      const model = this.registry.getComponent(entity, ModelComponent);
      if (model?.name !== "Sun" && model?.name !== "Sky") {
        this.registry.removeEntity(entity);
      }
    });

    // Create new entities based on JSON data
    for (const body of data.bodies) {
      if (body.name === "Sun") continue;

      const isMoon = body.type === ENTITY_TYPE.MOON;
      const parent = isMoon && body.parent
        ? this.registry.getEntityByID(this.registry.getEntityIdFromName(body.parent))
        : undefined;

      const entity = this.create({
        type: body.type,
        name: body.name,
        radius: body.radius,
        tiltAngle: body.tiltAngle,
        siderealDay: body.siderealDay,
        axis: body.axis ? vec3.fromValues(...body.axis) : undefined,
        parent,
        orbitData: body.orbitData ? {
          semiMajorAxis: body.orbitData.semiMajorAxis,
          eccentricity: body.orbitData.eccentricity,
          inclination: body.orbitData.inclination,
          longitudeOfAscendingNode: body.orbitData.longitudeOfAscendingNode,
          argumentOfPeriapsis: body.orbitData.argumentOfPeriapsis,
          meanAnomalyAtEpoch: body.orbitData.meanAnomalyAtEpoch,
          orbitalPeriod: body.orbitData.orbitalPeriod,
        } : undefined,
      });

      this.registry.setNameForEntityID(entity.id, body.name);
    }
  }
}
