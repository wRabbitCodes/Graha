import { IComponent } from "./Component";
import { Entity } from "./Entity";

type ComponentMap = Map<Function, IComponent>;
type ComponentType<T extends IComponent = IComponent> = new (...args: any[]) => T;

export class Registry {
  private nextId = 0;
  private entities = new Map<number, Entity>();
  private components = new Map<number, ComponentMap>();
  private entityToName = new Map<number, string>();

  createEntity(): Entity {
    const id = this.nextId++;
    const entity = new Entity(id);
    this.entities.set(id, entity);
    this.components.set(id, new Map());
    return entity;
  }

  addComponent<T extends IComponent>(entity: Entity, component: T): void {
    this.components.get(entity.id)!.set(component.constructor, component);
  }

  getComponent<T extends IComponent>(entity: Entity, compType: ComponentType<T>): T {
    return this.components.get(entity.id)?.get(compType) as T;
  }

  hasComponent<T extends IComponent>(entity: Entity, compType: ComponentType<T>): boolean {
    return this.components.get(entity.id)?.has(compType) ?? false;
  }

  removeComponent<T extends IComponent>(
    entity: Entity,
    compType: ComponentType<T>
  ): void {
    const compMap = this.components.get(entity.id);
    compMap?.delete(compType);
  }

  getEntitiesWith(...compTypes: ComponentType[]): Entity[] {
    const result: Entity[] = [];
    for (const [id, comps] of this.components.entries()) {
      if (compTypes.every((type) => comps.has(type))) {
        result.push(this.entities.get(id)!);
      }
    }
    return result;
  }

  removeEntity(entity: Entity): void {
    this.components.delete(entity.id);
    this.entities.delete(entity.id);
  }

  getAllEntities(): Entity[] {
    return [...this.entities.values()];
  }


  setNameForEntityID(entityID: number, name: string) {
    this.entityToName.set(entityID, name);
  }

  getNameFromEntityID(entityID: number): string {
    return this.entityToName.get(entityID)!;
  }

  getEntityIDToNameMap() {
    return this.entityToName as Readonly<Map<number, string>>;
  }

  getEntityByID(entityID: number) {
    return this.entities.get(entityID);
  }

}
