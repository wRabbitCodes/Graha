import { System } from "../System";

class HierarchySystem extends System {
  update(delta: number) {
    // for (const entity of this.getEntities()) {
    //   const hierarchy = this.registry.getComponent(HierarchyComponent, entity)!;
    //   const transform = this.registry.getComponent(TransformComponent, entity)!;
    //   if (hierarchy.parent) {
    //     const parentTransform = this.registry.getComponent(TransformComponent, hierarchy.parent)!;
    //     const parentMatrix = parentTransform.getModelMatrix();
    //     const localMatrix = transform.getLocalMatrix(); // create this method
    //     mat4.multiply(transform.worldMatrix, parentMatrix, localMatrix);
    //   } else {
    //     transform.worldMatrix = transform.getLocalMatrix();
    //   }
  }
}
