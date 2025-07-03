import { vec3 } from "gl-matrix";
import { ModelComponent } from "../engine/ecs/components/ModelComponent";
import { SunRenderComponent } from "../engine/ecs/components/RenderComponent";
import { TextureComponent } from "../engine/ecs/components/TextureComponent";
import { Entity } from "../engine/ecs/Entity";
import { Registry } from "../engine/ecs/Registry";
import { GLUtils } from "../utils/GLUtils";
import { IFactory } from "./IFactory";
import { SETTINGS } from "../config/settings";

export class SunFactory implements IFactory {
  constructor(
    private utils: GLUtils,
    private registry: Registry
  ) {}

  create(
    sunURL: string,
  ): Entity {
    const entity = this.registry.createEntity();

    const program = this.utils.createProgram(
       `#version 300 es
    #pragma vscode_glsllint_stage : vert

    precision mediump float;
    layout(location = 0) in vec2 a_position;

    uniform mat4 u_view;
    uniform mat4 u_proj;
    uniform vec3 u_worldPos;
    uniform float u_size;

    out vec2 v_uv;

    void main() {
      // Billboard vectors from view matrix
      vec3 right = vec3(u_view[0][0], u_view[1][0], u_view[2][0]);
      vec3 up    = vec3(u_view[0][1], u_view[1][1], u_view[2][1]);

      vec3 offset = a_position.x * right * u_size + a_position.y * up * u_size;
      vec3 worldPos = u_worldPos + offset;

      gl_Position = u_proj * u_view * vec4(worldPos, 1.0);

      v_uv = a_position * 0.5 + 0.5; // Map from [-1,1] to [0,1]
    }

`,
     `#version 300 es
    #pragma vscode_glsllint_stage : frag

    precision mediump float;
    uniform sampler2D u_lensflare;
    out vec4 fragColor;

    in vec2 v_uv;

    void main() {
      fragColor = texture(u_lensflare, v_uv);
    }
`
    );

    const texture = new TextureComponent();
    texture.sunURL = sunURL;
    this.registry.addComponent(entity, texture);
    
    const renderComp = new SunRenderComponent();
    renderComp.program = program;
    this.registry.addComponent(entity, renderComp);
    
    const modelComp = new ModelComponent();
    modelComp.name = "Sun";
    modelComp.tiltAngle = 0;
    modelComp.siderealDay = 0;
    modelComp.scale = vec3.fromValues(SETTINGS.SUN_SIZE, SETTINGS.SUN_SIZE, SETTINGS.SUN_SIZE);
    modelComp.position = vec3.fromValues(0,0,0);
    this.registry.addComponent(entity, modelComp);
    return entity;
  }
}
