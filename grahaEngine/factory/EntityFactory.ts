// src/factories/PlanetFactory.ts
import { vec3 } from "gl-matrix";
import { ENTITY_TYPE, ModelComponent } from "../engine/ecs/components/ModelComponent";
import { OrbitComponent } from "../engine/ecs/components/OrbitComponent";
import { PlanetRenderComponent } from "../engine/ecs/components/RenderComponent";
import { Entity } from "../engine/ecs/Entity";
import { Registry } from "../engine/ecs/Registry";
import { GLUtils } from "../utils/GLUtils";
import { IFactory } from "./IFactory";
import { EntitySelectionComponent } from "../engine/ecs/components/EntitySelectionComponent";
import { SETTINGS } from "../config/settings";
import { CCDComponent } from "../engine/ecs/components/CCDComponent";
import { MoonComponent } from "../engine/ecs/components/MoonComponent";
import { ShadowCasterComponent } from "../engine/ecs/components/ShadowCasterComponent";

export type EntityData = {
  name: string;
  radius: number;
  tiltAngle: number;
  siderealDay?: number;
  axis?: vec3;
  orbitData?: Partial<OrbitComponent>;
  parent?: Entity;
  type: ENTITY_TYPE;
};

export class EntityFactory implements IFactory {
  constructor(private utils: GLUtils, private registry: Registry) {}

  create(params: EntityData): Entity {
    const entity = this.registry.createEntity();
    this.registry.setNameForEntityID(entity.id, params.name)

    const orbitRadius =(params.orbitData?.semiMajorAxis!)/ SETTINGS.DISTANCE_SCALE;
    const planetScale = vec3.fromValues(
      params.radius / SETTINGS.SIZE_SCALE,
      params.radius / SETTINGS.SIZE_SCALE,
      params.radius / SETTINGS.SIZE_SCALE,
    );
    // Transform
    const transform = new ModelComponent();
    transform.position = vec3.fromValues(orbitRadius, 0, 0);
    transform.scale = planetScale;
    transform.tiltAngle = params.tiltAngle;
    transform.siderealDay = params.siderealDay ?? 24;
    transform.axis = params.axis ?? vec3.fromValues(0, 1, 0);
    transform.type = params.type;
    transform.name = params.name;
    this.registry.addComponent(entity, transform);
    

    // Orbit (optional)
    if (params.orbitData) {
      let orbit = new OrbitComponent();
      orbit.semiMajorAxis = params.orbitData.semiMajorAxis;
      orbit.eccentricity = params.orbitData.eccentricity;
      orbit.inclination = params.orbitData.inclination;
      orbit.longitudeOfAscendingNode =
        params.orbitData.longitudeOfAscendingNode;
      orbit.argumentOfPeriapsis = params.orbitData.argumentOfPeriapsis;
      orbit.perihelion = params.orbitData.perihelion ?? vec3.create();
      orbit.aphelion = params.orbitData.aphelion ?? vec3.create();
      orbit.orbitalPeriod = params.orbitData.orbitalPeriod;
      orbit.elapsedDays = params.orbitData.elapsedDays;

      this.registry.addComponent(entity, orbit);
    }

    //Selectable
    const selectionComp = new EntitySelectionComponent();
    this.registry.addComponent(entity, selectionComp);

    // CCD
    const ccdComp = new CCDComponent();
    this.registry.addComponent(entity, ccdComp);

    if (params.type === ENTITY_TYPE.MOON){
      if (!params.parent) throw Error("moon must have planet");
      const moonComp = new MoonComponent();
      moonComp.parentEntity = params.parent;
      this.registry.addComponent(entity, moonComp);

      const shadowCasterComp = new ShadowCasterComponent();
      this.registry.addComponent(moonComp.parentEntity, shadowCasterComp);
    }

    const renderComp = new PlanetRenderComponent();
    this.registry.addComponent(entity, renderComp);

    return entity;
  }
}
