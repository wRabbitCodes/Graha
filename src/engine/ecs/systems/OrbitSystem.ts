import { COMPONENT_STATE } from "../Component";
import { OrbitComponent } from "../components/OrbitComponent";
import { System } from "../System";

export class OrbitSystem extends System {
  update(deltaTime: number): void {
    for (const entity of this.registry
      .getEntitiesWith(OrbitComponent)
      .filter(Boolean)) {
      const component = this.registry.getComponent(entity, OrbitComponent);
      if (component.state === COMPONENT_STATE.UNINITIALIZED) return;
    }
  }
}
