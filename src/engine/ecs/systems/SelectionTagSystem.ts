import { GLUtils } from "../../../utils/GLUtils";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { EntitySelectionComponent } from "../components/EntitySelectionComponent";
import { TagComponent } from "../components/TagComponent";
import { Registry } from "../Registry";
import { System } from "../System";

export class SelectionTagSystem extends System implements IRenderSystem {
    constructor(
        public renderer: Renderer,
        registry: Registry,
        utils: GLUtils,
    ) {
        super(registry, utils);
    }

    update(deltaTime: number): void {
        for (const entity of this.registry.getEntitiesWith(EntitySelectionComponent, TagComponent)) {
            const selectionComp = this.registry.getComponent(entity, EntitySelectionComponent);
            if (selectionComp.state !== COMPONENT_STATE.READY) continue;
            if (!selectionComp.isSelected) {
                this.registry.removeComponent(entity, TagComponent);
            }

        }
    }


}