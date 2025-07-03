import { mat4 } from "gl-matrix";
import { HierarchyComponent } from "../components/HierarchyComponent";
import { ModelComponent } from "../components/ModelComponent";
import { System } from "../System";

export class HierarchySystem extends System {
  update(delta: number) {
    const registry = this.registry;

    for (const entity of registry.getEntitiesWith(ModelComponent)) {
      const model = registry.getComponent(entity, ModelComponent);
      const hierarchy = registry.hasComponent(entity, HierarchyComponent)
        ? registry.getComponent(entity, HierarchyComponent)
        : null;

      if (hierarchy && hierarchy.parent) {
        const parentModel = registry.getComponent(hierarchy.parent, ModelComponent);
        if (!parentModel) continue;

        // world = parent.world * local
        mat4.multiply(model.worldModelMatrix, parentModel.modelMatrix, model.modelMatrix);
      } else {
        // No parent? Use local as world
        mat4.copy(model.worldModelMatrix, model.modelMatrix);
      }
    }
  }
}
