import { mat4 } from "gl-matrix";
import { RenderContext } from "../../command/IRenderCommands";
import { IComponent } from "../../ecs/Component";
import { Shaders } from "../shaders/shaders";
import { BaseShaderStrategy } from "../shaderStrategy";
import { ModelComponent } from "../../ecs/components/ModelComponent";

export class SelectionGlowStrategy extends BaseShaderStrategy {
    initialize(): void {
        this.program = this.utils.createProgram(Shaders.selectionGlow.vert, Shaders.selectionGlow.frag);
        if (!this.program) throw new Error('BasicPlanet shader program not found');
        const gl = this.utils.gl;
        this.uniformLocations = {
            model: gl.getUniformLocation(this.program!, "u_model"),
            view: gl.getUniformLocation(this.program!, "u_view"),
            projection: gl.getUniformLocation(this.program!, "u_proj"),
            lightPos: gl.getUniformLocation(this.program!, "u_cameraPos"),
        };
    }
    setBindings(gl: WebGL2RenderingContext, ctx: RenderContext, components: { [key: string]: IComponent; }): void {
        gl.useProgram(this.program);
        const entityModelComp = components.entityModelComp as ModelComponent;
        const glowModel = mat4.clone(entityModelComp.modelMatrix);
        mat4.scale(glowModel, glowModel, [1.05, 1.05, 1.05]);

        gl.uniformMatrix4fv(
        this.uniformLocations.model,
        false,
        glowModel
        );
        gl.uniformMatrix4fv(
        this.uniformLocations.view,
        false,
        ctx.viewMatrix
        );
        gl.uniformMatrix4fv(
        this.uniformLocations.projection,
        false,
        ctx.projectionMatrix
        );
        gl.uniform3fv(
        this.uniformLocations.lightPos,
        ctx.cameraPos
        );
    }
}