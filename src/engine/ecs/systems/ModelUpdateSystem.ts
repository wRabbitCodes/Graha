import { mat3, mat4 } from "gl-matrix";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { COMPONENT_STATE } from "../Component";

export class ModelUpdateSystem extends System {
  async update(deltaTime: number) {
    for (const entity of this.registry.getEntitiesWith(
      ModelComponent,
    )) {
      const coreComp = this.registry.getComponent(
        entity,
        ModelComponent
      );
      if (!coreComp.position || !coreComp.scale) return;
      mat4.fromRotationTranslationScale(
        coreComp.modelMatrix,
        coreComp.rotationQuat,
        coreComp.position,
        coreComp.scale
      );
      mat3.normalFromMat4(coreComp.normalMatrix, coreComp.modelMatrix);
      if (coreComp.state !== COMPONENT_STATE.READY) coreComp.state = COMPONENT_STATE.READY;
  }
}
}

