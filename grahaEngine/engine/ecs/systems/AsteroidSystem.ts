// AsteroidSystem.ts
import { mat4, quat, vec3 } from "gl-matrix";
import { AsteroidComponent } from "../components/AsteroidComponent";
import { System } from "../System";

export class AsteroidSystem extends System {
  private tmpQuat = quat.create();
  private tmpMatrix = mat4.create();
  private tmpVec = vec3.create();

  update(delta: number): void {
    const registry = this.registry;

    for (const entity of registry.getEntitiesWith(AsteroidComponent)) {
      const asteroidComp = registry.getComponent(entity, AsteroidComponent);
      if (!asteroidComp || asteroidComp.instanceCount === 0) continue;

      const matrices = asteroidComp.instanceMatrices;
      const count = asteroidComp.instanceCount;

      for (let i = 0; i < count; i++) {
        const offset = i * 16;

        // Extract current matrix
        const mat = this.tmpMatrix;
        for (let j = 0; j < 16; j++) mat[j] = matrices[offset + j];

        // Extract position
        mat4.getTranslation(this.tmpVec, mat);

        // Apply a simple orbital rotation around Y axis
        const angle = 0.01 * delta; // radians per ms
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const x = this.tmpVec[0];
        const z = this.tmpVec[2];
        const newX = x * cos - z * sin;
        const newZ = x * sin + z * cos;
        vec3.set(this.tmpVec, newX, this.tmpVec[1], newZ);

        // Apply random small spin
        quat.fromEuler(this.tmpQuat, 0.2 * delta, 0.1 * delta, 0.15 * delta);

        mat4.fromRotationTranslationScale(mat, this.tmpQuat, this.tmpVec, [1, 1, 1]);

        // Copy back to buffer
        for (let j = 0; j < 16; j++) matrices[offset + j] = mat[j];
      }

      // Upload new matrix buffer
      const gl = this.utils.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, asteroidComp.instanceVBO);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, matrices);
    }
  }
}
