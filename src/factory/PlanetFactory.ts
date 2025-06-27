// src/factories/PlanetFactory.ts
import { vec3 } from "gl-matrix";
import { ModelComponent } from "../engine/ecs/components/ModelComponent";
import { OrbitComponent } from "../engine/ecs/components/OrbitComponent";
import { PlanetRenderComponent } from "../engine/ecs/components/RenderComponent";
import { TextureComponent } from "../engine/ecs/components/TextureComponent";
import { Entity } from "../engine/ecs/Entity";
import { Registry } from "../engine/ecs/Registry";
import { GLUtils } from "../engine/utils/GLUtils";
import { IFactory } from "./IFactory";

export class PlanetFactory implements IFactory {
  constructor(
    private utils: GLUtils,
    private registry: Registry
  ) {}

  create(params: {
    name: string;
    parent?: Entity;
    position: vec3;
    scale: vec3;
    surfaceURL: string;
    normalURL?: string;
    specularURL?: string;
    atmosphereURL?: string;
    orbitData?: Partial<OrbitComponent>;
  }): Entity {
    const entity = this.registry.createEntity();

    // Transform
    const transform = new ModelComponent();
    transform.position = params.position;
    transform.scale = params.scale;
    this.registry.addComponent(entity, transform);

    // // Orbit (optional)
    // if (params.orbitData) {
    //   const orbit = new OrbitComponent(
    //     params.orbitData.semiMajorAxis || 1,
    //     params.orbitData.eccentricity || 0,
    //     params.orbitData.inclination || 0,
    //     params.orbitData.longitudeOfAscendingNode || 0,
    //     params.orbitData.argumentOfPeriapsis || 0,
    //     params.orbitData.perihelion,
    //     params.orbitData.aphelion,
    //     params.orbitData.meanAnomalyAtEpoch || 0,
    //     params.orbitData.orbitalPeriod!,
    //     params.orbitData.elapsedDays
    //   );
    //   this.registry.addComponent(entity, orbit);
    // }

    // Texture Component (to be loaded by TextureSystem)
    const textureComponent = new TextureComponent();
    textureComponent.surfaceURL = params.surfaceURL;
    textureComponent.normalURL = params.normalURL;
    textureComponent.specularURL = params.specularURL;
    textureComponent.atmosphereURL = params.atmosphereURL;
    this.registry.addComponent(entity, textureComponent);

    // RenderComponent (VAO and programs setup)
    // const program = ShaderStrategy.getDefaultProgram(this.gl, this.utils);
    const program = this.utils.createProgram(
      `#version 300 es
    #pragma vscode_glsllint_stage : vert
    precision mediump float;

    in vec3 a_position;
    in vec3 a_normal;
    in vec2 a_uv;
    in vec3 a_tangent;

    uniform mat4 u_model;
    uniform mat4 u_view;
    uniform mat4 u_proj;
    uniform mat3 u_normalMatrix;

    out vec3 v_fragPos;
    out vec3 v_normal;
    out vec2 v_uv;
    out mat3 v_TBN;

    void main() {
      vec3 T = normalize(u_normalMatrix * a_tangent);  // Placeholder tangent
      vec3 N = normalize(u_normalMatrix * a_normal);  // Placeholder bitangent
      vec3 B = normalize(cross(N,T));

      v_TBN = mat3(T, B, N);
      v_uv = a_uv;
      vec4 worldPos = u_model * vec4(a_position, 1.0);
      v_fragPos = worldPos.xyz;
      v_normal = normalize(u_normalMatrix * a_normal);
      gl_Position = u_proj * u_view * worldPos;
    }
  `,
      `#version 300 es
    #pragma vscode_glsllint_stage : frag
    precision mediump float;

    in vec2 v_uv;
    in vec3 v_fragPos;
    in vec3 v_normal;
    in mat3 v_TBN;

    uniform sampler2D u_surfaceTexture;
    uniform sampler2D u_normalTexture;
    uniform sampler2D u_specularTexture;
    uniform sampler2D u_atmosphereTexture;

    uniform bool u_useNormal;
    uniform bool u_useSpecular;
    uniform bool u_useAtmosphere;

    uniform vec3 u_lightPos;
    uniform vec3 u_viewPos;

    out vec4 fragColor;

    void main() {
      vec3 fallbackColor = vec3(0.4, 0.7, 1.0);
      vec3 baseColor = texture(u_surfaceTexture, v_uv).rgb;
      if (length(baseColor) < 0.01) baseColor = fallbackColor;

      vec3 normal = normalize(v_normal);
      if (u_useNormal) {
        vec3 sampledNormal = texture(u_normalTexture, v_uv).rgb;
        sampledNormal = normalize(sampledNormal * 2.0 - 1.0);
        normal = normalize(v_TBN * sampledNormal); // Convert to world space
      }

      vec3 lightColor = vec3(1.0, 1.0, 0.9);
      vec3 lightDir = normalize(u_lightPos - v_fragPos);
      float diff = max(dot(normal, lightDir), 0.0);
      vec3 diffuse = diff * lightColor;

      vec3 ambient = 0.05 * lightColor;
      vec3 viewDir = normalize(u_viewPos - v_fragPos);
      vec3 reflectDir = reflect(-lightDir, normal);

      float spec = 0.0;
      if (u_useSpecular) {
        float specStrength = texture(u_specularTexture, v_uv).r;
        spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0) * specStrength * .8;
      }

      vec3 finalColor = (ambient + diffuse) * baseColor + vec3(spec);

      if (u_useAtmosphere) {
        vec3 atmo = texture(u_atmosphereTexture, v_uv).rgb;
        finalColor += atmo * 0.3;
      }

      fragColor = vec4(finalColor, 1.0);
    }
  `
    );

    const renderComp = new PlanetRenderComponent();
    renderComp.program = program;
    this.registry.addComponent(entity, renderComp);
    
    return entity;
  }
}
