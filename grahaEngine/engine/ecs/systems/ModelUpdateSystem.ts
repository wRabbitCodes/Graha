import { mat4, quat, vec3 } from "gl-matrix";
import { COMPONENT_STATE } from "../Component";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { Registry } from "../Registry";
import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { Camera } from "@/grahaEngine/core/Camera";

export class ModelUpdateSystem extends System {
  constructor(private camera: Camera, registry: Registry, utils: GLUtils) {
    super(registry, utils);
  }
  update(deltaTime: number) {
    for (const entity of this.registry.getEntitiesWith(ModelComponent)) {
      const coreComp = this.registry.getComponent(entity, ModelComponent);
      if (coreComp.state === COMPONENT_STATE.UNINITIALIZED) {
        let tiltQuat = quat.create();
        quat.setAxisAngle(
          tiltQuat,
          vec3.fromValues(1, 0, 0),
          (coreComp.tiltAngle * Math.PI) / 180
        );
        coreComp.tiltQuat = tiltQuat;
        coreComp.spinQuat = quat.create();
        coreComp.state = COMPONENT_STATE.READY;
      }
      if (coreComp.state === COMPONENT_STATE.READY) {
        const siderealDay = coreComp.siderealDay * 3600 * 1000; // Convert hours to ms

        // Rotation speed in radians/ms, scaled
        const rotationSpeedRadPerMs = (2 * Math.PI) / siderealDay;

        // Rotation angle this frame
        const angleRad = (rotationSpeedRadPerMs * deltaTime) % (2 * Math.PI);
        coreComp.rotationSpeed = rotationSpeedRadPerMs;
        const qRotation = quat.setAxisAngle(
          quat.create(),
          coreComp.axis,
          angleRad
        );

        quat.multiply(coreComp.spinQuat, qRotation, coreComp.spinQuat);
        quat.multiply(
          coreComp.rotationQuat,
          coreComp.tiltQuat!,
          coreComp.spinQuat
        );

        // Floating point origin methods to cull precision loss
        const cameraRelativeMatrix = mat4.create();
        mat4.translate(cameraRelativeMatrix, coreComp.modelMatrix, vec3.negate(vec3.create(), this.camera.position));
        coreComp.modelMatrix = cameraRelativeMatrix;
        mat4.fromRotationTranslationScale(
          coreComp.modelMatrix,
          coreComp.rotationQuat,
          coreComp.position!,
          vec3.fromValues(coreComp.radius!, coreComp.radius!,coreComp.radius!)
        );

        
      }
    }
  }
}
