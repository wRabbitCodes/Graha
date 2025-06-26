import { quat } from "gl-matrix";
import { RotationComponent } from "../components/PlanetRotationComponent";
import { TransformComponent } from "../components/TransformComponent";
import { Registry } from "../Registry";
import { System } from "../System";

export class RotationSystem extends System {
  update(reg: Registry, dt: number) {
    for (const e of reg.getEntitiesWith(RotationComponent, TransformComponent)) {
      const t = reg.getComponent(e, TransformComponent)!;
      const r = reg.getComponent(e, RotationComponent)!;
      const qRotation = quat.setAxisAngle(quat.create(), r.axis, r.rotationPerFrame * dt / 100);
      quat.multiply(t?.getSpinQuat(), qRotation, t.spinQuat);
    }
  }
}
