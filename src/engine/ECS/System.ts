import { Registry } from "./Registry";

export abstract class System {
  abstract update(registry: Registry, deltaTime: number): void;
}
