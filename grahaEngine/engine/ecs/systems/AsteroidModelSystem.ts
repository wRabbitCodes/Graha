import { mat4, vec3 } from "gl-matrix";
import { System } from "../System";
import { AsteroidModelComponent } from "../components/AsteroidModelComponent";

export class AsteroidModelSystem extends System {
  update(deltaTime: number): void {
    const entities = this.registry.getEntitiesWith(AsteroidModelComponent);
    for (const entity of entities) {
      const cloud = this.registry.getComponent(entity, AsteroidModelComponent);
      const { positions, rotationSpeeds, center } = cloud;
      const count = positions.length / 3;

      const rotMat = mat4.create();

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const pos = vec3.fromValues(
          positions[idx],
          positions[idx + 1],
          positions[idx + 2]
        );

        // Rotate around Y, relative to center
        const angle = rotationSpeeds[i] * deltaTime;
        mat4.fromYRotation(rotMat, angle);

        vec3.subtract(pos, pos, center);
        vec3.transformMat4(pos, pos, rotMat);
        vec3.add(pos, pos, center);

        positions.set(pos, idx);

        
      }
    }
  }
}
