import { mat4, vec3 } from "gl-matrix";
import { RenderContext } from "../../command/IRenderCommands";
import { IComponent } from "../../ecs/Component";
import { Shaders } from "../shaders/shaders";
import { BaseShaderStrategy } from "../shaderStrategy";
import { ModelComponent } from "../../ecs/components/ModelComponent";
import { TagRenderComponent } from "../../ecs/components/RenderComponent";
import { OrbitComponent } from "../../ecs/components/OrbitComponent";

export class TagStrategy extends BaseShaderStrategy {
    initialize(): void {
        this.program = this.utils.createProgram(Shaders.tag.vert, Shaders.tag.frag);
        const gl = this.utils.gl;
        this.uniformLocations = {
            view: gl.getUniformLocation(this.program, "u_view"),
            proj: gl.getUniformLocation(this.program, "u_proj"),
            viewPortSize: gl.getUniformLocation(this.program, "u_viewportSize"),
            cameraPos: gl.getUniformLocation(this.program, "u_cameraPos"),
            worldPos: gl.getUniformLocation(this.program, "u_worldPos"),
            basePixelSize: gl.getUniformLocation(this.program, "u_basePixelSize"),
            time: gl.getUniformLocation(this.program, "u_time"),
            text: gl.getUniformLocation(this.program, "u_text"),
            canvasSize: gl.getUniformLocation(this.program, "u_canvasSize"),
            fillDuration: gl.getUniformLocation(this.program, "u_fillDuration"),
            glowDuration: gl.getUniformLocation(this.program, "u_glowDuration")
        };
    }

    setBindings(gl: WebGL2RenderingContext, ctx: RenderContext, components: { [key: string]: IComponent; }): void {
        const modelComp = components.modelComp as ModelComponent;
        const renderComp = components.renderComp as TagRenderComponent;
        gl.useProgram(this.program);
        gl.uniformMatrix4fv(
            this.uniformLocations.view,
            false,
            ctx.viewMatrix
        );
        gl.uniformMatrix4fv(
            this.uniformLocations.proj,
            false,
            ctx.projectionMatrix
        );
        gl.uniform2f(
            this.uniformLocations.viewPortSize,
            ctx.canvasWidth,
            ctx.canvasHeight
        );
        gl.uniform3fv(
            this.uniformLocations.cameraPos,
            ctx.cameraPos
        );

        const scale = vec3.create();
        mat4.getScaling(scale, modelComp.modelMatrix);
        const radius = Math.max(...scale);
        const worldPos = vec3.clone(modelComp.position!);
        worldPos[1] += radius; // Align with planet's Y-axis

        gl.uniform3fv(
            this.uniformLocations.worldPos,
            worldPos
        );
        gl.uniform1f(
            this.uniformLocations.basePixelSize,
            48 // Adjusted for fixed screen size
        );
        gl.uniform1f(
            this.uniformLocations.time,
            renderComp.animationTime
        );
        gl.uniform2fv(
            this.uniformLocations.canvasSize,
            renderComp.canvasSize!
        );
        gl.uniform1f(
            this.uniformLocations.fillDuration,
            5.0 // 5 seconds for fill phase
        );
        gl.uniform1f(
            this.uniformLocations.glowDuration,
            3.0 // 3 seconds for full glow phase
        );

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderComp.texture!);
        gl.uniform1i(this.uniformLocations.text, 0);
    }
}