import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import { SphereMesh } from "../../../utils/GLUtils";
import { COMPONENT_STATE, IComponent, IState } from "../Component";
import { MeshData } from "@/grahaEngine/core/AssetsLoader";

export abstract class RenderComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  program: WebGLProgram | null = null;
  VAO: WebGLVertexArrayObject | null = null;
  VBO: WebGLBuffer | null = null;
}

export class PlanetRenderComponent extends RenderComponent {
  sphereMesh?: SphereMesh;
  atmosphereProgram?: WebGLProgram;
}

export class SkyRenderComponent extends RenderComponent {
  sphereMesh?: SphereMesh;
}

export class SunRenderComponent extends RenderComponent {
  sphereMesh?: SphereMesh;
  coreVAO: WebGLVertexArrayObject | null = null;
  coreProgram: WebGLProgram | null = null;
}

export class SelectionGlowRenderComponent extends RenderComponent {
}

export class TagRenderComponent extends RenderComponent {
  currentText = "";
  size: vec2 = vec2.fromValues(5, 2.5);
  center: vec3 = vec3.create();
  color: vec4 = [0.2, 1.0, 0.8, 0.8];
  modelMatrix: mat4 = mat4.create();
  textCanvas?: HTMLCanvasElement;
  time = 0;
  flickerOffset = Math.random() * 100;
  canvasSize?: vec2;
  animationTime = 0;
  // blinkTimer = 0;
  // isBlinking = false;
  // pulseStrength = 0;
  // pulseDecayRate = 1.5; // seconds
  // isReady = false;
  texture?: WebGLTexture;
  readonly popupQuad = new Float32Array([
    // x, y,    u, v
    -0.5, -0.5, 0, 0, 0.5, -0.5, 1, 0, -0.5, 0.5, 0, 1, 0.5, 0.5, 1, 1,
  ]);
}

export class BBPlotRenderComponent extends RenderComponent {
  vertexShader = `#version 300 es
    precision highp float;
    layout(location = 0) in vec3 a_position;
    uniform mat4 u_model;
    uniform mat4 u_view;
    uniform mat4 u_proj;
    void main() {
      gl_Position = u_proj * u_view * u_model * vec4(a_position, 1.0);
    }
  `;

  fragmentShader = `#version 300 es
    precision mediump float;
    out vec4 fragColor;
    void main() {
      fragColor = vec4(1.0, 0.0, 0.0, 1.0); // red wireframe
    }
  `;

  sphereMesh?: SphereMesh;
}

export class OrbitPathRenderComponent extends RenderComponent {
  vertSrc = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in float a_index;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;
uniform float u_totalVerts;
uniform float u_headIndex;
uniform vec3 u_viewDir;

out float v_alpha;
out vec3 v_position;
out float v_fresnel;

void main() {
  float idx = mod(a_index, u_totalVerts);
  // Calculate distance from head index, considering the orbit as a loop
  float dist = mod(idx - u_headIndex + u_totalVerts, u_totalVerts);
  float fadeLength = u_totalVerts * 0.5; // Tail spans half the orbit
  float t = dist / fadeLength;
  v_alpha = 1.0 - smoothstep(0.0, 1.0, t); // Fade out towards tail

  vec4 worldPos = u_model * vec4(a_position, 1.0);
  v_position = worldPos.xyz;

  // Approximate normal for line strip
  float nextIdx = mod(a_index + 1.0, u_totalVerts);
  vec3 nextPos = a_position + vec3(0.01, 0.0, 0.0); // Fallback offset
  vec3 tangent = normalize(nextPos - a_position);
  vec3 normal = normalize(cross(tangent, u_viewDir));
  v_fresnel = pow(1.0 - abs(dot(normal, u_viewDir)), 3.0); // Fresnel term

  gl_Position = u_proj * u_view * worldPos;
}
`;

  fragSrc = `#version 300 es
precision mediump float;

in float v_alpha;
in vec3 v_position;
in float v_fresnel;

uniform vec3 u_baseColor;

out vec4 fragColor;

void main() {
  if (v_alpha < 0.01) discard;

  // Base color with Fresnel glow
  vec3 glowColor = u_baseColor * 1.5; // Brighter for glow
  vec3 color = mix(u_baseColor, glowColor, v_fresnel);
  float finalAlpha = v_alpha * (0.3 + 0.7 * v_fresnel); // Enhance alpha with Fresnel

  fragColor = vec4(color, finalAlpha);
}
`;
}

export class AsteroidPointCloudRenderComponent extends RenderComponent {
 vertShader = `#version 300 es
    layout(location = 0) in vec3 a_position;
    uniform mat4 u_view;
    uniform mat4 u_proj;
    void main() {
      gl_Position = u_proj * u_view * vec4(a_position, 1.0);
      gl_PointSize = 0.01; // screen-space size
    }
  `;

  fragShader = `#version 300 es
    precision mediump float;
    out vec4 fragColor;
    void main() {
      fragColor = vec4(0.85, 0.85, 0.85, 1.0); // dusty rock color
    }
  `;
}

export class AsteroidModelRenderComponent extends RenderComponent {
  vertShader = `#version 300 es
    precision highp float;

    layout(location = 0) in vec3 a_position;
    layout(location = 1) in vec3 a_normal;
    layout(location = 2) in vec3 a_instancePos;
    layout(location = 3) in vec2 a_uv;
    layout(location = 4) in float a_instanceScale;

    uniform mat4 u_view;
    uniform mat4 u_proj;

    out vec3 v_normal;
    out vec2 v_uv;
    out vec3 v_worldPos;

    void main() {
      vec3 worldPos = a_position * a_instanceScale + a_instancePos;
      v_worldPos = worldPos;
      gl_Position = u_proj * u_view * vec4(worldPos, 1.0);

      v_normal = a_normal;
      v_uv = a_uv;
    }`;

  fragShader = `#version 300 es
    precision highp float;

    in vec3 v_normal;
    in vec2 v_uv;
    in vec3 v_worldPos;

    uniform sampler2D u_diffuse;

    out vec4 fragColor;

    void main() {
      vec3 lightDir = normalize(vec3(0.0) - v_worldPos); // from fragment to origin
      float diff = max(dot(normalize(v_normal), lightDir), 0.0);

      vec3 texColor = texture(u_diffuse, v_uv).rgb;
      vec3 color = texColor * diff + 0.1; // lighting + ambient

      fragColor = vec4(color, 1.0);
    }`;
  mesh?: Partial<MeshData>
}
