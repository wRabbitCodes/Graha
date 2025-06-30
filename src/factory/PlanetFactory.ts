// src/factories/PlanetFactory.ts
import { vec3 } from "gl-matrix";
import { ModelComponent } from "../engine/ecs/components/ModelComponent";
import { OrbitComponent } from "../engine/ecs/components/OrbitComponent";
import { PlanetRenderComponent } from "../engine/ecs/components/RenderComponent";
import { TextureComponent } from "../engine/ecs/components/TextureComponent";
import { Entity } from "../engine/ecs/Entity";
import { Registry } from "../engine/ecs/Registry";
import { GLUtils } from "../utils/GLUtils";
import { IFactory } from "./IFactory";
import { EntitySelectionComponent } from "../engine/ecs/components/EntitySelectionComponent";
import { SETTINGS } from "../config/settings";
import { CCDComponent } from "../engine/ecs/components/CCDComponent";

export type PlanetData = {
  name: string;
  radius: number;
  tiltAngle: number;
  surfaceURL: string;
  normalURL?: string;
  specularURL?: string;
  atmosphereURL?: string;
  nightURL?: string;
  siderealDay?: number;
  axis?: vec3;
  orbitData?: Partial<OrbitComponent>;
  parent?: Entity;
};

export class PlanetFactory implements IFactory {
  constructor(private utils: GLUtils, private registry: Registry) {}

  create(params: PlanetData): Entity {
    const entity = this.registry.createEntity();

    const orbitRadius =params.orbitData?.semiMajorAxis! / SETTINGS.DISTANCE_SCALE;
    const planetScale = vec3.fromValues(
      params.radius / SETTINGS.SIZE_SCALE,
      params.radius / SETTINGS.SIZE_SCALE,
      params.radius / SETTINGS.SIZE_SCALE,
    );
    // Transform
    const transform = new ModelComponent();
    transform.name = params.name;
    transform.position = vec3.fromValues(orbitRadius, 0, 0);
    transform.scale = planetScale;
    transform.tiltAngle = params.tiltAngle;
    transform.siderealDay = params.siderealDay ?? 24;
    transform.axis = params.axis ?? vec3.fromValues(0, 1, 0);
    this.registry.addComponent(entity, transform);

    // Orbit (optional)
    if (params.orbitData) {
      let orbit = new OrbitComponent();
      orbit.semiMajorAxis = params.orbitData.semiMajorAxis;
      orbit.eccentricity = params.orbitData.eccentricity;
      orbit.inclination = params.orbitData.inclination;
      orbit.longitudeOfAscendingNode =
        params.orbitData.longitudeOfAscendingNode;
      orbit.argumentOfPeriapsis = params.orbitData.argumentOfPeriapsis;
      orbit.perihelion = params.orbitData.perihelion ?? vec3.create();
      orbit.aphelion = params.orbitData.aphelion ?? vec3.create();
      orbit.orbitalPeriod = params.orbitData.orbitalPeriod;
      orbit.elapsedDays = params.orbitData.elapsedDays;

      this.registry.addComponent(entity, orbit);
    }
    // Texture Component (to be loaded by TextureSystem)
    const textureComponent = new TextureComponent();
    textureComponent.surfaceURL = params.surfaceURL;
    textureComponent.normalURL = params.normalURL;
    textureComponent.specularURL = params.specularURL;
    textureComponent.atmosphereURL = params.atmosphereURL;
    textureComponent.nightURL = params.nightURL;
    this.registry.addComponent(entity, textureComponent);

    //Selectable
    const selectionComp = new EntitySelectionComponent();
    this.registry.addComponent(entity, selectionComp);

    // CCD
    const ccdComp = new CCDComponent();
    this.registry.addComponent(entity, ccdComp);

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
  uniform sampler2D u_nightTexture;

  uniform bool u_useNormal;
  uniform bool u_useSpecular;
  uniform bool u_useAtmosphere;
  uniform bool u_useNight;

  uniform float u_atmosphereRotation;

  uniform vec3 u_lightPos;
  uniform vec3 u_viewPos;

  out vec4 fragColor;

  void main() {
    vec3 fallbackColor = vec3(0.4, 0.7, 1.0);
    vec3 surfaceColor = texture(u_surfaceTexture, v_uv).rgb;
    if (length(surfaceColor) < 0.01) surfaceColor = fallbackColor;

    vec3 normal = normalize(v_normal);
    if (u_useNormal) {
      vec3 sampledNormal = texture(u_normalTexture, v_uv).rgb;
      sampledNormal = normalize(sampledNormal * 2.0 - 1.0);
      normal = normalize(v_TBN * sampledNormal);
    }

    vec3 lightDir = normalize(u_lightPos - v_fragPos);
    vec3 viewDir = normalize(u_viewPos - v_fragPos);
    vec3 reflectDir = reflect(-lightDir, normal);
    float diff = max(dot(normal, lightDir), 0.0);

    float dayFactor = smoothstep(0.05, 0.25, diff);  // soft transition
    float nightFactor = clamp(1.0 - diff, 0.0, 1.0); 
    nightFactor = pow(nightFactor, 3.0);

    // --- NIGHT COLOR ---
    vec3 nightColor = vec3(0.0);
    if (u_useNight) {
      nightColor = texture(u_nightTexture, v_uv).rgb;
    }

    // --- DAY LIGHTING ---
    vec3 lightColor = vec3(1.0, 1.0, 0.9);
    vec3 ambient = 0.05 * lightColor;
    vec3 diffuse = diff * lightColor;

    float spec = 0.0;
    if (u_useSpecular && dayFactor > 0.0) {
      float specStrength = texture(u_specularTexture, v_uv).r;
      spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0) * specStrength * 0.8;
    }

    // --- DAY LIGHTED COLOR ---
    vec3 dayLitColor = (ambient + diffuse) * surfaceColor + vec3(spec);

    // --- FINAL BLENDING ---
    vec3 finalColor = mix(nightColor, dayLitColor, dayFactor);

    fragColor = vec4(finalColor, 1.0);
  }`);


  const atmosphereProgram = this.utils.createProgram(
   `#version 300 es
    precision mediump float;

    layout(location = 0)in vec3 a_position;
    layout(location = 2)in vec2 a_uv;

    uniform mat4 u_model;
    uniform mat4 u_view;
    uniform mat4 u_proj;

    out vec2 v_uv;
    out vec3 v_worldPos;

    void main() {
      v_uv = a_uv;
      vec4 worldPos = u_model * vec4(a_position, 1.0);
      v_worldPos = worldPos.xyz;
      gl_Position = u_proj * u_view * worldPos;
    }`,

   `#version 300 es
    #pragma vscode_glsllint_stage : frag
    precision mediump float;

    in vec2 v_uv;
    in vec3 v_worldPos;

    uniform sampler2D u_atmosphereTexture;
    uniform float u_rotation;       // horizontal scroll for cloud motion
    uniform float u_opacity;        // base opacity of atmosphere
    uniform float u_time;           // time for animation
    uniform float u_fogDensity;     // controls fog thickness (e.g. 0.015)
    uniform vec3 u_cameraPos;       // for depth/distance-based fog

    out vec4 fragColor;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    // 2D pseudo-noise
    float noise(vec2 uv) {
      vec2 i = floor(uv);
      vec2 f = fract(uv);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0, 0)), hash(i + vec2(1, 0)), u.x),
        mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x),
        u.y
      );
    }
    void main() {
      // --- Base UV rotation for clouds
      vec2 rotatedUV = vec2(mod(v_uv.x + u_rotation, 1.0), v_uv.y);
      
      // --- Add turbulence noise to UVs
      float turbulence = noise(rotatedUV * 8.0 + u_time * 0.1);
      vec2 distortedUV = rotatedUV + 0.01 * vec2(turbulence, turbulence);

      // --- Sample cloud texture
      vec3 atmosphereColor = texture(u_atmosphereTexture, distortedUV).rgb;

      // --- Distance from camera (fog based on depth)
      float dist = length(u_cameraPos - v_worldPos);
      float fogFactor = 1.0 - exp(-pow(dist * u_fogDensity, 1.2)); // smoothstep fog
      fogFactor = clamp(fogFactor, 0.0, 1.0);

      // --- Fade out atmosphere based on fog and vertical latitude (optional)
      float lat = abs(v_uv.y - 0.5) * 2.0;
      float latFade = smoothstep(1.0, 0.6, lat); // fade near poles
      float alpha = u_opacity * latFade * fogFactor;

      fragColor = vec4(atmosphereColor, alpha);
    }
    `);

    const renderComp = new PlanetRenderComponent();
    renderComp.program = program;
    renderComp.atmosphereProgram = atmosphereProgram;
    this.registry.addComponent(entity, renderComp);

    return entity;
  }
}
