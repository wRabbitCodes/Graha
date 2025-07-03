import { mat4, vec3 } from "gl-matrix";
import { Camera } from "../../../core/Camera";
import { GLUtils } from "../../../utils/GLUtils";
import { COMPONENT_STATE } from "../Component";
import {
  CameraLatchComponent,
  LATCH_STATES,
} from "../components/CameraLatchComponent";
import { EntitySelectionComponent } from "../components/EntitySelectionComponent";
import { ModelComponent } from "../components/ModelComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { Entity } from "../Entity";

export class CameraLatchSystem extends System {
  constructor(
    private camera: Camera,
    registry: Registry,
    utils: GLUtils
  ) {
    super(registry, utils);
  }

  update(deltaTime: number): void {
    const selectedEntities = this.registry.getEntitiesWith(
      EntitySelectionComponent,
      ModelComponent
    );

    let selectedEntity: Entity | null = null;
    for (const entity of selectedEntities) {
      const selection = this.registry.getComponent(entity, EntitySelectionComponent);
      if (selection?.isSelected) {
        selectedEntity = entity;
        break;
      }
    }

    // No selection: disable latch mode, cleanup all
    if (selectedEntity === null) {
      this.camera.disableLatchMode();
      for (const entity of this.registry.getEntitiesWith(CameraLatchComponent)) {
        this.registry.removeComponent(entity, CameraLatchComponent);
      }
      return;
    }

    const model = this.registry.getComponent(selectedEntity, ModelComponent);
    if (!model || model.state !== COMPONENT_STATE.READY) return;

    for (const entity of this.registry.getEntitiesWith(CameraLatchComponent)) {
      if (entity !== selectedEntity) {
        this.registry.removeComponent(entity, CameraLatchComponent);
      }
    }

    let latch = this.registry.getComponent(selectedEntity, CameraLatchComponent);
    if (!latch) {
      latch = new CameraLatchComponent();
      this.registry.addComponent(selectedEntity, latch);
    }

    switch (latch.transitionState) {
      case LATCH_STATES.TRANSITIONING:
        this.updateTransition(latch, model, deltaTime);
        break;

      case LATCH_STATES.LATCHED:
        this.camera.updateLatchedTarget(model.position!); // always follow moving target
        break;
    }
  }

  private updateTransition(
    latch: CameraLatchComponent,
    model: ModelComponent,
    deltaTime: number
  ) {
  if (latch.state === COMPONENT_STATE.UNINITIALIZED) {
  vec3.copy(latch.startPosition, this.camera.getPosition());
  latch.elapsed = 0;
  latch.transitionTime = 2;
  latch.state = COMPONENT_STATE.READY;
}

  // This is now dynamic every frame — orbit around moving target
  latch.elapsed += deltaTime / 1000;
  const t = this.smoothstep(0, 1, latch.elapsed / latch.transitionTime);

  const interpolated = vec3.lerp(vec3.create(), latch.startPosition, model.position!, t);
  this.camera.setPosition(interpolated);

  const dist = vec3.distance(interpolated, model.position!);
  if (dist <= 0.1) {
    this.camera.enableLatchMode(model.position!, this.computeRadius(model) * model.boundingBoxScale);
    latch.transitionState = LATCH_STATES.LATCHED;
  }

}


  private computeRadius(model: ModelComponent): number {
    const scale = vec3.create();
    mat4.getScaling(scale, model.modelMatrix);
    return Math.max(...scale) * model.boundingBoxScale;
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
    return t * t * (3 - 2 * t);
  }
}
