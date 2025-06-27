// src/factories/PlanetFactory.ts
import { vec3 } from "gl-matrix";
import { OrbitComponent } from "../engine/ecs/components/OrbitComponent";
import { SkyRenderComponent } from "../engine/ecs/components/RenderComponent";
import { SkysphereTextureComponent } from "../engine/ecs/components/SkysphereTextureComponent";
import { Entity } from "../engine/ecs/Entity";
import { Registry } from "../engine/ecs/Registry";
import { GLUtils } from "../engine/utils/GLUtils";

export class SkyFactory {
  constructor(
    private gl: WebGL2RenderingContext,
    private utils: GLUtils,
    private registry: Registry
  ) {}

  createSky(
    surfaceURL: string,
  ): Entity {
    const entity = this.registry.createEntity();

    const program = this.utils.createProgram(
       `#version 300 es
    #pragma vscode_glsllint_stage : vert
    precision mediump float;
    in vec3 a_position;
    in vec2 a_uv;
    out vec2 v_uv;
    uniform mat4 u_view;
    uniform mat4 u_proj;
    void main() {
      v_uv = a_uv;
      vec4 pos = u_proj * u_view * vec4(a_position, 1.0);
      gl_Position = pos.xyww;
    }
  `,
      `#version 300 es
    #pragma vscode_glsllint_stage : frag
    precision mediump float;
    in vec2 v_uv;
    out vec4 outColor;
    uniform sampler2D u_texture;
    void main() {
      vec3 skyColor = texture(u_texture, v_uv).rgb * 0.3; // REDUCE SKYSPHERE BRIGHTNESS
      outColor = vec4(skyColor, 1.0);
    }
  `
    );

    const texture = new SkysphereTextureComponent(
       surfaceURL,
    )
    this.registry.addComponent(entity, texture);
    const render = new SkyRenderComponent(
      program,
    );
    this.registry.addComponent(entity, render);
    
    return entity;
  }
}
