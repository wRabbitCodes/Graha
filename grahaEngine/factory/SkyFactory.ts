// src/factories/PlanetFactory.ts
import { SkyRenderComponent } from "../engine/ecs/components/RenderComponent";
import { Entity } from "../engine/ecs/Entity";
import { Registry } from "../engine/ecs/Registry";
import { GLUtils } from "../utils/GLUtils";
import { IFactory } from "./IFactory";

export class SkyFactory implements IFactory{
  constructor(
    private utils: GLUtils,
    private registry: Registry
  ) {}

  create(
  ): Entity {
    const entity = this.registry.createEntity();

    const renderComp = new SkyRenderComponent();
    this.registry.addComponent(entity, renderComp);
    
    return entity;
  }
}
