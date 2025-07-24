import { SettingsState } from "@/grahaEngine/core/Scene";
import { GLUtils } from "../../utils/GLUtils";
import { Registry } from "./Registry";

type SystemType = new (...args: any[]) => System;

export abstract class System {
  constructor(protected registry: Registry, protected utils: GLUtils) { };
  abstract update(deltaTime: number): void;
}

export class SystemManager {
  private managedSystems: Map<SystemType, System> = new Map();
  private conditionalSystems: Map<SystemType, { system: System; condition: (settings: SettingsState) => boolean }> = new Map();
  private unmanagedSystem: Map<SystemType, System> = new Map();

  registerSystem(system: System, condition?: (settings: SettingsState) => boolean, isManaged = true) {
    if (condition) {
      this.conditionalSystems.set(system.constructor as SystemType, { system, condition });
    } else {
      if (!isManaged) this.unmanagedSystem.set(system.constructor as SystemType, system)
      else this.managedSystems.set(system.constructor as SystemType, system);
    }
  }

  getUnmanagedSystem(system: SystemType) {
    return this.unmanagedSystem.get(system);
  }

  getConditionalSystem(system: SystemType) {
    return this.conditionalSystems.get(system);
  }

  getManagedSystem(system: SystemType) {
    return this.managedSystems.get(system);
  }

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