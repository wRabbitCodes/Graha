import { MeshData } from "@/grahaEngine/core/AssetsLoader";
import { mat4, quat, vec3 } from "gl-matrix";
import { Entity } from "../engine/ecs/Entity";
import { Registry } from "../engine/ecs/Registry";
import { IFactory } from "./IFactory";
import { COMPONENT_STATE } from "../engine/ecs/Component";
import { AsteroidPointCloudComponent } from "../engine/ecs/components/AsteroidPointCloudComponent";
import { SETTINGS } from "../config/settings";

export class AsteroidFactory implements IFactory {
  constructor(private registry: Registry) {}
  create() {
    const entity = this.registry.createEntity();
    /// CALCULATION FOR POINTS
    const AU = 1.496e8; // in km
    const innerRadius = 2.1 * AU / SETTINGS.DISTANCE_SCALE;
    const outerRadius = 3.3 * AU / SETTINGS.DISTANCE_SCALE;
    const verticalSpread = 0.15 * AU / SETTINGS.DISTANCE_SCALE; // ±Y thickness of tube
    const eccentricityRange = 0.05; // small offset from circular to slightly elliptical
    const count = 5000;

    const positions = new Float32Array(count * 3);
    const rotationSpeeds = new Float32Array(count); // optional per-asteroid speed

    for (let i = 0; i < count; i++) {
      // Semi-major axis in the asteroid belt range
      const a = innerRadius + Math.random() * (outerRadius - innerRadius);

      // Small random eccentricity (for ellipse-like orbits)
      const e = Math.random() * eccentricityRange;

      // Compute corresponding semi-minor axis b
      const b = a * Math.sqrt(1 - e * e);

      // Random angle θ in orbit (in radians)
      const theta = Math.random() * 2 * Math.PI;

      // Parametric ellipse formula
      const x = a * Math.cos(theta);
      const z = b * Math.sin(theta);

      // Y value gives the "tube" thickness
      const y = (Math.random() - 0.5) * verticalSpread;

      positions.set([x, y, z], i * 3);

      // Random slight orbital speed offset
      rotationSpeeds[i] = 0.00005 + Math.random() * 0.00003; // radians/ms
    }

    ///
    const asteroidComp = new AsteroidPointCloudComponent();
    asteroidComp.positions = positions;
    asteroidComp.center = vec3.fromValues(0, 0, 0);
    asteroidComp.rotationSpeeds = rotationSpeeds
    asteroidComp.state = COMPONENT_STATE.READY;
    this.registry.addComponent(entity, asteroidComp);
    return entity;
  }
}
