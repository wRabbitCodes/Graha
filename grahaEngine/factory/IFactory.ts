import { Entity } from "../engine/ecs/Entity";

export interface IFactory {
  create: (...params: any[]) => Entity;
}