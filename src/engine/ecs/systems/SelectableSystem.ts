import { mat4, vec3 } from "gl-matrix";
import { Camera } from "../../../core/Camera";
import { GLUtils } from "../../utils/GLUtils";
import { Raycaster } from "../../utils/Raycaster";
import { COMPONENT_STATE } from "../Component";
import { ModelComponent } from "../components/ModelComponent";
import { SelectableComponent } from "../components/SelectableComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { Entity } from "../Entity";

export class SelectableSystem extends System {
  constructor(private rayCaster: Raycaster, private camera: Camera, registry: Registry, utils: GLUtils ) {
    super(registry, utils);
  }
  update(deltaTime: number): void {
    let closet_dist = 0;
    let selectedEntity: Entity | null = null;
    for (const entity of this.registry.getEntitiesWith(SelectableComponent, ModelComponent)) {
      const modelComp = this.registry.getComponent(entity, ModelComponent);
      if(modelComp.state !== COMPONENT_STATE.READY) continue;
      const selectableComp = this.registry.getComponent(entity, SelectableComponent);
      selectableComp.isSelected = false;
      const ray = this.rayCaster.setFromViewMatrix(this.camera.getViewMatrix());
      const scaleFromModel = vec3.create();
      mat4.getScaling(scaleFromModel, modelComp.modelMatrix)
      const distance = this.rayCaster.intersectSphere(
        ray.origin,
        ray.direction,
        modelComp.modelMatrix,
        Math.max(...scaleFromModel), // Highest Scale is the Radius
      );

      if (distance !== null && distance < closet_dist) {
        closet_dist = distance;
        selectedEntity = entity;
      }
    }
    if (!selectedEntity) return;
    const selectableComp = this.registry.getComponent(selectedEntity, SelectableComponent)
  }

}