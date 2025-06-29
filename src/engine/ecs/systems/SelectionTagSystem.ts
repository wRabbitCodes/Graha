import { mat4, vec2, vec3 } from "gl-matrix";
import { GLUtils } from "../../../utils/GLUtils";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { EntitySelectionComponent } from "../components/EntitySelectionComponent";
import { ModelComponent } from "../components/ModelComponent";
import { TagRenderComponent } from "../components/RenderComponent";
import { TextureComponent } from "../components/TextureComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { RenderContext } from "../../command/IRenderCommands";

export class SelectionTagSystem extends System implements IRenderSystem {
    constructor(
        public renderer: Renderer,
        registry: Registry,
        utils: GLUtils,
    ) {
        super(registry, utils);
    }

    update(deltaTime: number): void {
        for (const entity of this.registry.getEntitiesWith(EntitySelectionComponent, ModelComponent, TextureComponent)) {
            const selectionComp = this.registry.getComponent(entity, EntitySelectionComponent);
            if (selectionComp?.state !== COMPONENT_STATE.READY) continue;
            if (!selectionComp?.isSelected) {
                this.registry.removeComponent(entity, TagRenderComponent);
                continue;
            }
            debugger;

            const textureComp = this.registry.getComponent(entity, TextureComponent);
            if (textureComp.state !== COMPONENT_STATE.READY) continue;

            const modelComp = this.registry.getComponent(entity, ModelComponent);
            if (modelComp.state !== COMPONENT_STATE.READY) continue;

            let renderComp = this.registry.getComponent(entity, TagRenderComponent);
            if (!renderComp) {
                renderComp = new TagRenderComponent();
                this.registry.addComponent(entity, renderComp);
            }
            if (renderComp.state === COMPONENT_STATE.UNINITIALIZED) this.initialize(modelComp, renderComp);

            if (renderComp.state !== COMPONENT_STATE.READY) continue;

            this.updateTag(deltaTime, renderComp, modelComp);

            this.renderer.enqueue({
                execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                    gl.disable(gl.DEPTH_TEST); // Optional: to render over planets

                    gl.useProgram(renderComp.program);
                    gl.bindVertexArray(renderComp.VAO);

                    // Billboard logic — rotate to face camera
                    const billboard = mat4.create();
                    const viewInverse = mat4.invert(mat4.create(), ctx.viewMatrix)!;

                    // Use only rotation part (upper-left 3x3)
                    for (let i = 0; i < 3; ++i)
                        for (let j = 0; j < 3; ++j) billboard[i * 4 + j] = viewInverse[i * 4 + j];

                    // Combine translation (from modelMatrix) + billboard rotation
                    const finalModel = mat4.create();
                    mat4.multiply(finalModel, renderComp.modelMatrix, billboard); // T * R
                    mat4.scale(finalModel, finalModel, [renderComp.size[0], renderComp.size[1], 1]); // apply size

                    gl.uniformMatrix4fv(
                        gl.getUniformLocation(renderComp.program!, "u_model"),
                        false,
                        finalModel
                    );
                    gl.uniformMatrix4fv(
                        gl.getUniformLocation(renderComp.program!, "u_view"),
                        false,
                        ctx.viewMatrix
                    );
                    gl.uniformMatrix4fv(
                        gl.getUniformLocation(renderComp.program!, "u_proj"),
                        false,
                        ctx.projectionMatrix
                    );

                    gl.uniform1f(gl.getUniformLocation(renderComp.program!, "u_time"), renderComp.time);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, renderComp.texture!);
                    gl.uniform1i(gl.getUniformLocation(renderComp.program!, "u_text"), 0);

                    gl.getError();
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                    gl.getError();
                    gl.enable(gl.DEPTH_TEST);
                    gl.disable(gl.BLEND);
                    gl.bindVertexArray(null);

                }
            })


        }
    }

    private initialize(modelComp: ModelComponent, renderComp: TagRenderComponent) {
        renderComp.program = this.utils.createProgram(renderComp.vertShader, renderComp.fragShader);
        this.setupVAO(renderComp);
        this.bindTextTexture(modelComp, renderComp);
        renderComp.state = COMPONENT_STATE.READY;
    }

    private setupVAO(renderComp: TagRenderComponent) {
        const gl = this.utils.gl;
        const vao = gl.createVertexArray();
        const buffer = gl.createBuffer()!;
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, renderComp.popupQuad, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

        renderComp.VAO = vao;
    }


    private bindTextTexture(modelComp: ModelComponent, component: TagRenderComponent) {
        const gl = this.utils.gl;
        const canvas = document.createElement("canvas");
        component.textCanvas = canvas;
        canvas.width = 1024;
        canvas.height = 256;

        // Load the local font
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = `120px NeonSans`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 4;   // strokeText outline width
        ctx.shadowBlur = 0;  // Disable blur
        ctx.fillStyle = "#00ffff"; // Neon cyan color
        ctx.fillText(modelComp.name!, canvas.width / 2, canvas.height / 2);

        // === Upload to GPU ===
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        component.texture = tex;
    }


    private updateTag(dt: number, renderComp: TagRenderComponent, modelComp: ModelComponent) {
        renderComp.time += dt / 50000000;
        const scale = vec3.create();
        mat4.getScaling(scale, modelComp.modelMatrix);
        const radius = Math.max(...scale);
        vec2.set(renderComp.size, radius + renderComp.textCanvas?.width!, radius + renderComp.textCanvas?.height!);
        const offsetY = radius;
        const popupPos = vec3.create();
        vec3.set(
            popupPos,
            modelComp.position![0],
            modelComp.position![1] + offsetY + renderComp.textCanvas?.height!,
            modelComp.position![2]
        );
        mat4.fromTranslation(renderComp.modelMatrix, popupPos);
    }

}