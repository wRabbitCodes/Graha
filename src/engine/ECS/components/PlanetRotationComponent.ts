import { quat } from "gl-matrix";
import { IComponent } from "../iComponent";
import { PlanetCoreComponent } from "./PlanetCoreComponent";

export class RotationComponent
  extends PlanetCoreComponent
  implements IComponent
{
  rotationPerFrame = 0.03;
  spinQuat = quat.create();
  rotationQuat = quat.create();
  tiltQuat = quat.create();
}
