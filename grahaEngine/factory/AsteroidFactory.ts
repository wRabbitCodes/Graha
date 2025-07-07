import { quat, vec3 } from "gl-matrix";
import { SETTINGS } from "../config/settings";
import { COMPONENT_STATE } from "../engine/ecs/Component";
import { AsteroidModelComponent } from "../engine/ecs/components/AsteroidModelComponent";
import { AsteroidPointCloudComponent } from "../engine/ecs/components/AsteroidPointCloudComponent";
import { Registry } from "../engine/ecs/Registry";
import { IFactory } from "./IFactory";

export class AsteroidFactory implements IFactory {
  constructor(private registry: Registry) {}

  create() {
    const entity = this.registry.createEntity();
    const asteroidPCComp = new AsteroidPointCloudComponent();
    [asteroidPCComp.positions, asteroidPCComp.rotationSpeeds] =
      this.generatePoints(50000);
    asteroidPCComp.center = vec3.fromValues(0, 0, 0);
    asteroidPCComp.state = COMPONENT_STATE.READY;
    this.registry.addComponent(entity, asteroidPCComp);

    const instances = 500;
    const asteroidMComp = new AsteroidModelComponent();
    [asteroidMComp.positions, asteroidMComp.rotationSpeeds, asteroidMComp.scales] =
      this.generatePoints(instances);
    asteroidMComp.center = vec3.fromValues(0, 0, 0);
    asteroidMComp.instanceCount = instances; // set instanceCount here
    asteroidMComp.state = COMPONENT_STATE.READY;
    this.registry.addComponent(entity, asteroidMComp);

    return entity;
  }

  private generatePoints(count: number) {
    /// CALCULATION FOR POINTS
    const AU = 1.496e8; // in km
    const innerRadius = (2.1 * AU) / SETTINGS.DISTANCE_SCALE;
    const outerRadius = (3.3 * AU) / SETTINGS.DISTANCE_SCALE;
    const verticalSpread = (1.0 * AU) / SETTINGS.DISTANCE_SCALE; // ±Y thickness of tube
    const eccentricityRange = 0.1; // small offset from circular to slightly elliptical

    const positions = new Float32Array(count * 3);
    const rotationSpeeds = new Float32Array(count); // optional per-asteroid speed
    const rotations: quat[] = [];
    const rotationAxes: vec3[] = [];
    const scales = new Float32Array(count);

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

      rotations.push(quat.create()); // identity
      rotationAxes.push(vec3.normalize(vec3.create(), [
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ]));

      scales[i] = 1.5 + Math.random() * 10.0; // Between 2.0 and 6.0 (adjust as needed)
    }
    return [positions, rotationSpeeds, scales];
  }
}
