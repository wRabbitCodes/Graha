import { SunRenderComponent } from "../engine/ecs/components/RenderComponent";
import { Entity } from "../engine/ecs/Entity";
import { Registry } from "../engine/ecs/Registry";
import { GLUtils } from "../utils/GLUtils";
import { IFactory } from "./IFactory";

export class SunFactory implements IFactory {
  constructor(
    private registry: Registry
  ) {}
  
  create(
  ): Entity {
    const entity = this.registry.createEntity();
    this.registry.setNameForEntityID(entity.id, 'sun');
    const renderComp = new SunRenderComponent();
    this.registry.addComponent(entity, renderComp);
    
    return entity;
  }
}
