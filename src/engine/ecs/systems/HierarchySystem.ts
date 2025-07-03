import { mat4 } from "gl-matrix";
import { HierarchyComponent } from "../components/HierarchyComponent";
import { ModelComponent } from "../components/ModelComponent";
import { System } from "../System";
import { Entity } from "../Entity";
import { Registry } from "../Registry";

export class HierarchySystem extends System {
  static addParent(child: Entity, parent: Entity, registry: Registry) {
    // Get or create HierarchyComponent on child
    let childHierarchy = registry.getComponent(child, HierarchyComponent);
    if (!childHierarchy) {
      childHierarchy = new HierarchyComponent();
      registry.addComponent(child, childHierarchy);
    }
    childHierarchy.parent = parent;

    // Get or create HierarchyComponent on parent
    let parentHierarchy = registry.getComponent(parent, HierarchyComponent);
    if (!parentHierarchy) {
      parentHierarchy = new HierarchyComponent();
      registry.addComponent(parent, parentHierarchy);
    }

    // Add to parent's children list (if not already added)
    if (!parentHierarchy.children.includes(child)) {
      parentHierarchy.children.push(child);
    }
  }

  static addChild(parent: Entity, child: Entity, registry: Registry) {
    // Just flip the call
    this.addParent(child, parent, registry);
  }
  update(delta: number) {
    const registry = this.registry;

    const visited = new Set<Entity>();
    const updateWorldMatrix = (entity: Entity, parentWorldMatrix?: mat4) => {
      debugger;
      if (visited.has(entity)) return; // prevent circular references
      visited.add(entity);

      const model = registry.getComponent(entity, ModelComponent);
      const hierarchy = registry.getComponent(entity, HierarchyComponent);

      if (parentWorldMatrix) {
        mat4.multiply(model.worldModelMatrix, parentWorldMatrix, model.modelMatrix);
      } else {
        mat4.copy(model.worldModelMatrix, model.modelMatrix);
      }

      // Now recursively update all children
      for (const childEntity of hierarchy.children ?? []) {
        updateWorldMatrix(childEntity, model.worldModelMatrix);
      }
    };

    // Start from root nodes (no parent)
    for (const entity of registry.getEntitiesWith(ModelComponent, HierarchyComponent)) {
      const hierarchy = registry.getComponent(entity, HierarchyComponent);
      debugger;
      if (!hierarchy.parent) {
        updateWorldMatrix(entity);
      }
    }
  }
}
