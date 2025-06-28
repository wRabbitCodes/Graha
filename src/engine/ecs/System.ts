import { GLUtils } from "../../utils/GLUtils";
import { COMPONENT_STATE, IComponent, IState } from "./Component";
import { Registry } from "./Registry";

export abstract class System {
  constructor(protected registry: Registry, protected utils: GLUtils) {};
  abstract update(deltaTime: number): void;
}
