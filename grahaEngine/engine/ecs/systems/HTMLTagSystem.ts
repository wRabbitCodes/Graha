import { vec4, mat4, vec3 } from "gl-matrix";
import { System } from "../System";
import { Registry } from "../Registry";
import { ModelComponent } from "../components/ModelComponent";
import { COMPONENT_STATE } from "../Component";
import { RenderContext } from "../../command/IRenderCommands";
import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { Renderer } from "../../command/Renderer";

export class HTMLTagSystem extends System {
    private tagElements: Map<string, HTMLDivElement> = new Map();
    private container: HTMLDivElement;
    private enabled: boolean = true;

    constructor(private renderer: Renderer, registry: Registry, utils: GLUtils) {
        super(registry, utils);

        // Create and style the tag container
        this.container = document.createElement("div");
        this.container.id = "tag-container";
        Object.assign(this.container.style, {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: "1000",
        });
        document.body.appendChild(this.container);

        // Add default styles for tags
        const style = document.createElement("style");
        style.textContent = `
        .html-tagger-label {
            position: absolute;
            font-family: NeonSans;
            font-size: 12px;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
            transform: translate(-50%, -100%);
            .edge-pointer {
                background: rgba(255, 80, 80, 0.8);
                border: 1px solid red;
                border-radius: 100px;
                font-weight: bold;
                font-size: 11px;
            }
        }
        `;
        document.head.appendChild(style);
    }
    
    isEnabled() {
        return this.enabled === true;
    }

    enableTags() {
        if (this.enabled) return;
        this.enabled = true;
        // Toggle visibility of all tags
        for (const tag of this.tagElements.values()) {
            tag.style.display = "block";
        }
    }

    disableTags() {
        if(!this.enabled) return;
        this.enabled = false;
        // Toggle visibility of all tags
        for (const tag of this.tagElements.values()) {
            tag.style.display = "none";
        }
    }
    
    update(_: number): void {
        const viewProj = mat4.create();
        const ctx = this.renderer.getRenderContext();
        mat4.multiply(viewProj, ctx.projectionMatrix!, ctx.viewMatrix!);

        const canvas = this.utils.gl.canvas as HTMLCanvasElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        for (const entity of this.registry.getEntitiesWith(ModelComponent)) {
            const modelComp = this.registry.getComponent(entity, ModelComponent);
            if (modelComp.state !== COMPONENT_STATE.READY) continue;
            if (!modelComp.name) continue;
            const radius =  Math.max(...mat4.getScaling(vec3.create(), modelComp.modelMatrix));
            const pos = modelComp.position!;
            const yOffset = radius ?? 10; // Optional: use radius if available
            const worldPos = vec4.fromValues(pos[0], pos[1] + yOffset, pos[2], 1);
            vec4.transformMat4(worldPos, worldPos, viewProj);

            // Get or create tag
            let tag = this.tagElements.get(modelComp.name);
            if (!tag) {
                tag = document.createElement("div");
                tag.className = "html-tagger-label";
                tag.textContent = modelComp.name;
                this.container.appendChild(tag);
                this.tagElements.set(modelComp.name, tag);
            }

            // Clip test (behind camera or off-screen)
            if (worldPos[3] <= 0) continue;
                const ndcX = worldPos[0] / worldPos[3];
                const ndcY = worldPos[1] / worldPos[3];

                let screenX = (ndcX * 0.5 + 0.5) * width;
                let screenY = (1.0 - (ndcY * 0.5 + 0.5)) * height;

                // Flag for offscreen
                const isOffscreen = ndcX < -1 || ndcX > 1 || ndcY < -1 || ndcY > 1;

                if (isOffscreen) {
                const edgePadding = 10;

                // Clamp to edges
                screenX = Math.max(edgePadding, Math.min(width - edgePadding, screenX));
                screenY = Math.max(edgePadding, Math.min(height - edgePadding, screenY));

                // Optional: add a pointer-like style
                tag.classList.add("edge-pointer");
                } else {
                tag.classList.remove("edge-pointer");
            }


            tag.style.display = "block";
            const prevX = parseFloat(tag.dataset.prevX ?? `${screenX}`);
            const prevY = parseFloat(tag.dataset.prevY ?? `${screenY}`);

            const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
            const smoothX = lerp(prevX, screenX, 0.05);
            const smoothY = lerp(prevY, screenY, 0.05);

            tag.style.left = `${Math.floor(smoothX)}px`;
            tag.style.top = `${Math.floor(smoothY)}px`;

            tag.dataset.prevX = `${smoothX}`;
            tag.dataset.prevY = `${smoothY}`;

        }
    }
}
