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
  pathSegmentCount = 180;
  orbitColor?: vec3;
}

export class AsteroidPointCloudRenderComponent extends RenderComponent {
  vertShader = `#version 300 es
    layout(location = 0) in vec3 a_position;
    layout(location = 1) in float a_seed;

    uniform mat4 u_view;
    uniform mat4 u_proj;

    out float v_seed;

    void main() {
      v_seed = a_seed;
      gl_Position = u_proj * u_view * vec4(a_position, 1.0);

      // Tiny points with time-varying shimmer
      gl_PointSize = 0.01;
    }
    `;

  fragShader = `#version 300 es
    precision mediump float;

    in float v_seed;
    uniform float u_time;
    out vec4 fragColor;

    // Include noise functions
    float hash(float n) {
      return fract(sin(n) * 43758.5453123);
    }
    float noise(float x) {
      float i = floor(x);
      float f = fract(x);
      float u = f * f * (3.0 - 2.0 * f);
      return mix(hash(i), hash(i + 1.0), u);
    }

    void main() {
      // Per-point, time-varying noise
      float flicker = 0.5 + 0.5 * noise(v_seed * 100.0 + u_time * 0.1); // slow noise
      fragColor = vec4(vec3(flicker), 1.0);
    }`;
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
