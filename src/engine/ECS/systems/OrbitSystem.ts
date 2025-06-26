import { COMPONENT_STATE } from "../../iState";
import { OrbitComponent } from "../components/OrbitComponent";
import { Registry } from "../Registry";
import { System } from "../System";

export class OrbitSystem extends System {
    update(registry: Registry, deltaTime: number): void {
        
        for (const entity of registry.getEntitiesWith(OrbitComponent).filter(Boolean)) {
            const component = registry.getComponent(entity, OrbitComponent);
            if (component.state === COMPONENT_STATE.UNINITIALIZED) 
        }


    }

}