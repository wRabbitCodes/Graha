import { vec3 } from "gl-matrix";
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
      this.generatePointsRadialTorus(10000);
    asteroidPCComp.center = vec3.fromValues(0, 0, 0);
    asteroidPCComp.state = COMPONENT_STATE.READY;
    this.registry.addComponent(entity, asteroidPCComp);

    const instances = 500;
    const asteroidMComp = new AsteroidModelComponent();
    [asteroidMComp.positions, asteroidMComp.rotationSpeeds, asteroidMComp.scales] =
      this.generatePointsRadialTorus(instances);
    asteroidMComp.center = vec3.fromValues(0, 0, 0);
    asteroidMComp.instanceCount = instances; // set instanceCount here
    asteroidMComp.state = COMPONENT_STATE.READY;
    this.registry.addComponent(entity, asteroidMComp);

    return entity;
  }

 private generatePointsRadialTorus(count: number) {
  const AU = 1.496e8;
  const innerRadius = (2.1 * AU) / SETTINGS.DISTANCE_SCALE;
  const outerRadius = (3.3 * AU) / SETTINGS.DISTANCE_SCALE;
  const beltThickness = 0.8 * AU / SETTINGS.DISTANCE_SCALE; // radius of tube

  const positions = new Float32Array(count * 3);
  const rotationSpeeds = new Float32Array(count);
  // const rotations: quat[] = [];
  // const rotationAxes: vec3[] = [];

  const scales = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Major radius (distance from origin)
    const R = innerRadius + Math.random() * (outerRadius - innerRadius);
    // Minor angle around torus tube
    const tubeTheta = Math.random() * Math.PI * 2;
    const tubeRadius = (Math.random() - 0.5) * beltThickness;

    // Random angle along orbit
    const orbitAngle = Math.random() * Math.PI * 2;

    // Calculate position using torus math
    const x = (R + tubeRadius * Math.cos(tubeTheta)) * Math.cos(orbitAngle);
    const y = tubeRadius * Math.sin(tubeTheta);
    const z = (R + tubeRadius * Math.cos(tubeTheta)) * Math.sin(orbitAngle);

    positions.set([x, y, z], i * 3);
    rotationSpeeds[i] = 0.00005 + Math.random() * 0.00003;

    // rotations.push(quat.create());
    // rotationAxes.push(vec3.normalize(vec3.create(), [
    //   Math.random() - 0.5,
    //   Math.random() - 0.5,
    //   Math.random() - 0.5
    // ]));
    scales[i] = 1.5 + Math.random() * 10.0;
  }

  return [positions, rotationSpeeds, scales];
}
}
