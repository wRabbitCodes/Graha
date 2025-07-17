import { SettingsState } from "@/grahaEngine/core/Scene";
import { GLUtils } from "../../utils/GLUtils";
import { Registry } from "./Registry";

type SystemType = new (...args: any[]) => System;

export abstract class System {
  constructor(protected registry: Registry, protected utils: GLUtils) { };
  abstract update(deltaTime: number): void;
}

export class SystemManager {
  private managedSystems: System[] = [];
  private conditionalSystems: { system: System; condition: (settings: SettingsState) => boolean }[] = [];
  private unmanagedSystem: Map<SystemType, System> = new Map();

  registerSystem(system: System, condition?: (settings: SettingsState) => boolean, isManaged = true) {
    if (condition) {
      this.conditionalSystems.push({ system, condition });
    } else {
      if (!isManaged) this.unmanagedSystem.set(system.constructor as SystemType, system)
      else this.managedSystems.push(system);
    }
  }

  getUnmanagedSystem(system: SystemType) {
    return this.unmanagedSystem.get(system);
  }

  // initialize() {
  //   this.systems.forEach((system) => system.initialize?.());
  //   this.conditionalSystems.forEach(({ system }) => system.initialize?.());
  // }

  update(deltaTime: number, settings: SettingsState) {

    // DO NOT HANDLE UNMANAGED SYSTEMS
    this.managedSystems.forEach((system) => system.update(deltaTime));
    this.conditionalSystems.forEach(({ system, condition }) => {
      if (condition(settings)) {
        system.update(deltaTime);
      }
    });
  }
}