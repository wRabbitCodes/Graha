import { COMPONENT_STATE, IComponent, IState } from "../Component";
import { Entity } from "../Entity";

export class HierarchyComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  parent?: Entity;
  children: Entity[] = [];
}