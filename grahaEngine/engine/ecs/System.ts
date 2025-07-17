import { Camera } from "@/grahaEngine/core/Camera";
import { GLUtils } from "../../utils/GLUtils";
import { Renderer } from "../command/Renderer";
import { COMPONENT_STATE, IComponent, IState } from "./Component";
import { Registry } from "./Registry";
import { SettingsState } from "@/grahaEngine/core/Scene";
import { AssetsLoader } from "@/grahaEngine/core/AssetsLoader";

export abstract class System {
  constructor(protected registry: Registry, protected utils: GLUtils) {};
  abstract update(deltaTime: number): void;
}

export class SystemManager {
  private systems: System[] = [];
  private conditionalSystems: { system: System; condition: (settings: SettingsState) => boolean }[] = [];

  constructor(
    private registry: Registry,
    private renderer: Renderer,
    private camera: Camera,
    private utils: GLUtils,
    private assetsLoader: AssetsLoader
  ) {}

  registerSystem(system: System, condition?: (settings: SettingsState) => boolean) {
    if (condition) {
      this.conditionalSystems.push({ system, condition });
    } else {
      this.systems.push(system);
    }
  }

  // initialize() {
  //   this.systems.forEach((system) => system.initialize?.());
  //   this.conditionalSystems.forEach(({ system }) => system.initialize?.());
  // }

  update(deltaTime: number, settings: SettingsState) {
    debugger;
    this.systems.forEach((system) => system.update(deltaTime));
    this.conditionalSystems.forEach(({ system, condition }) => {
      if (condition(settings)) {
        system.update(deltaTime);
      }
    });
  }
}