import { mat4, vec3 } from "gl-matrix";
import { GLUtils } from "../../../utils/GLUtils";
import { Raycaster } from "../../../utils/Raycaster";
import { COMPONENT_STATE } from "../Component";
import { ModelComponent } from "../components/ModelComponent";
import { EntitySelectionComponent } from "../components/EntitySelectionComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { Entity } from "../Entity";
import { Camera } from "../../../core/Camera"
import grahaEvents, { GRAHA_ENGINE_EVENTS } from "@/grahaEngine/utils/EventManager";

export class EntitySelectionSystem extends System {
  private selectedEntities: Set<string> = new Set();
  constructor(
    private rayCaster: Raycaster,
    private camera: Camera,
    registry: Registry,
    utils: GLUtils
  ) {
    super(registry, utils);
  }
  update(deltaTime: number): void {
    let closet_dist = Infinity;
    let selectedEntity: Entity | null = null;
    for (const entity of this.registry.getEntitiesWith(
      EntitySelectionComponent,
      ModelComponent
    )) {
      const modelComp = this.registry.getComponent(entity, ModelComponent);
      if (modelComp.state !== COMPONENT_STATE.READY) continue;
      const ray = this.rayCaster.setFromViewMatrix(this.camera.viewMatrix);
      const scaleFromModel = vec3.create();
      mat4.getScaling(scaleFromModel, modelComp.modelMatrix);
      const distance = this.rayCaster.intersectSphere(
        ray.origin,
        ray.direction,
        modelComp.modelMatrix,
        Math.max(...scaleFromModel) // Highest Scale is the Radius
      );

      if (distance !== null && distance < closet_dist) {
        closet_dist = distance;
        selectedEntity = entity;
      }
    }

    if (!selectedEntity) return;
    const selectableComp = this.registry.getComponent(
      selectedEntity,
      EntitySelectionComponent
    );
    selectableComp.isSelected = !selectableComp.isSelected;
    const model = this.registry.getComponent(selectedEntity, ModelComponent);
    selectableComp.isSelected ? this.selectedEntities.add(model.name!) : this.selectedEntities.delete(model.name!);
    selectableComp.state = COMPONENT_STATE.READY;

    grahaEvents.emit(GRAHA_ENGINE_EVENTS.SELECTED_ENTITIES, { names: Array.from(this.selectedEntities)});
  }
}
