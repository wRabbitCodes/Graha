// src/engine/EntityManager.ts

import { Entity } from "../models/Entity";
import { mat4, vec3 } from "gl-matrix";

export class EntityManager {
  private entities: Entity[] = [];

  add(entity: Entity) {
    this.entities.push(entity);
  }

  remove(entity: Entity) {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) {
      this.entities.splice(idx, 1);
    }
  }

  update(deltaTime: number) {
    for (const entity of this.entities) {
      entity.update(deltaTime);
    }
  }

  render(viewMatrix: mat4, projectionMatrix: mat4, lightPos: vec3, cameraPos: vec3) {
    for (const entity of this.entities) {
      entity.render(viewMatrix, projectionMatrix, lightPos, cameraPos);
    }
  }

  clear() {
    this.entities.length = 0;
  }

  getEntity(name: string): Entity | undefined {
    return this.entities.find(entity => entity.getName() === name);
  }
}
