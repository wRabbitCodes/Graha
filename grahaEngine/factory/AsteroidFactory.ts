import { MeshData } from "@/grahaEngine/core/AssetsLoader";
import { mat4, quat, vec3 } from "gl-matrix";
import { Entity } from "../engine/ecs/Entity";
import { Registry } from "../engine/ecs/Registry";
import { AsteroidComponent } from "../engine/ecs/components/AsteroidComponent";
import { IFactory } from "./IFactory";
import { COMPONENT_STATE } from "../engine/ecs/Component";

export class AsteroidFactory implements IFactory {
  constructor(private registry: Registry) {}
  create(mesh: MeshData) {
    const entity = this.registry.createEntity();

    const comp = new AsteroidComponent();
    comp.mesh = mesh;

    this.registry.addComponent(entity, comp);
    return entity;
  }

  spawnAsteroidCluster(
    modelEntity: Entity,
    count: number,
    minRadius: number,
    maxRadius: number,
    angleRange: [number, number]
  ) {
    const comp = this.registry.getComponent(modelEntity, AsteroidComponent);
    if (!comp || !comp.mesh) return;
    comp.instanceCount = count;
    comp.instanceMatrices = new Float32Array(count * 16);

    for (let i = 0; i < count; i++) {
      const angle = this.randomRange(angleRange[0], angleRange[1]);
      const radius =
        minRadius + Math.pow(Math.random(), 2) * (maxRadius - minRadius);
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const y = this.randomRange(-0.05, 0.05);

      const scale = this.randomRange(0.05, 0.25);
      const pos = vec3.fromValues(x, y, z);
      const rot = quat.create();
      quat.random(rot);

      // === Spin Axis & Initial Angle ===
      const axis = vec3.normalize(vec3.create(), [
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ]);
      const initialAngle = Math.random() * 2 * Math.PI;

      comp.spinAxes.push(axis);
      comp.spinAngles.push(initialAngle);

      // === Transform matrix ===
      const mat = mat4.create();
      mat4.fromRotationTranslationScale(mat, rot, pos, [scale, scale, scale]);
      comp.instanceMatrices.set(mat, i * 16);

      comp.state = COMPONENT_STATE.READY;
    }
  }

  private randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}
