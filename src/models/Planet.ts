import { mat4, vec3, quat, mat3 } from "gl-matrix";
import { GLUtils } from "../engine/utils/GLUtils";
import { Entity } from "./Entity";
import { OrbitSystem } from "../systems/OrbitManager";
import { AxisHelper } from "../systems/AxisPlotter";

type PlanetTextureTypes = {
  [Key in
    | "surface"
    | "normal"
    | "specular"
    | "atmosphere"]: WebGLTexture | null;
};

export class Planet implements Entity {
  private gl: WebGL2RenderingContext;
  private utils: GLUtils;
  private program: WebGLProgram;
  private glowProgram: WebGLProgram;
  private vao?: WebGLVertexArrayObject;
  private indexCount = 0;

  private modelMatrix = mat4.identity(mat4.create());
  private rotationQuat = quat.create();
  private tiltQuat = quat.create();
  private spinQuat = quat.create();
  private position: vec3;
  private scale: vec3;
  private axis = vec3.fromValues(0, 1, 0);
  private rotationPerFrame = 0.03;
  private selected = false;

  setSelected(val: boolean) {
    this.selected = val;
  }

  isSelected() {
    return this.selected;
  }

  private orbit?: OrbitSystem;

  private uniformLocations: { [key: string]: WebGLUniformLocation | null } = {};
  private textures: PlanetTextureTypes = {
    surface: null,
    normal: null,
    specular: null,
    atmosphere: null,
  };

  update(deltaTime: number) {
    this.updateRotation(deltaTime);
  }

  constructor(
    private name: string,
    gl: WebGL2RenderingContext,
    utils: GLUtils,
    position: vec3 = vec3.create(),
    scale: vec3 = vec3.fromValues(1, 1, 1),
    tiltAngle: number,
    private surfaceURL: string,
    private axisHelper?: AxisHelper,
    private normalMapURL?: string,
    private atmosphereURL?: string,
    private specularURL?: string
  ) {
    this.gl = gl;
    this.utils = utils;
    this.position = position;
    this.scale = scale;

    quat.setAxisAngle(
      this.tiltQuat,
      vec3.fromValues(1, 0, 0),
      (tiltAngle * Math.PI) / 180
    );
    this.program = this.utils.createProgram(
      Planet.vertexShaderSrc,
      Planet.fragmentShaderSrc
    );

    this.glowProgram = this.utils.createProgram(
      Planet.glowVert,
      Planet.glowFrag
    );
    this.initUniforms();
    this.setupMesh();
    this.loadTextures();
  }

  setPosition(pos: vec3): void {
    vec3.copy(this.position, pos);
  }

  private initUniforms() {
    const gl = this.gl;
    this.uniformLocations.normalMatrix = gl.getUniformLocation(
      this.program,
      "u_normalMatrix"
    );
    this.uniformLocations.surface = gl.getUniformLocation(
      this.program,
      "u_surfaceTexture"
    );
    this.uniformLocations.normal = gl.getUniformLocation(
      this.program,
      "u_normalTexture"
    );
    this.uniformLocations.specular = gl.getUniformLocation(
      this.program,
      "u_specularTexture"
    );
    this.uniformLocations.atmosphere = gl.getUniformLocation(
      this.program,
      "u_atmosphereTexture"
    );
    this.uniformLocations.model = gl.getUniformLocation(
      this.program,
      "u_model"
    );
    this.uniformLocations.view = gl.getUniformLocation(this.program, "u_view");
    this.uniformLocations.projection = gl.getUniformLocation(
      this.program,
      "u_proj"
    );
    this.uniformLocations.lightPos = gl.getUniformLocation(
      this.program,
      "u_lightPos"
    );
    this.uniformLocations.viewPos = gl.getUniformLocation(
      this.program,
      "u_viewPos"
    );
    this.uniformLocations.useNormal = gl.getUniformLocation(
      this.program,
      "u_useNormal"
    );
    this.uniformLocations.useSpecular = gl.getUniformLocation(
      this.program,
      "u_useSpecular"
    );
    this.uniformLocations.useAtmosphere = gl.getUniformLocation(
      this.program,
      "u_useAtmosphere"
    );
  }

  private setupMesh() {
    const sphere = this.utils.createUVSphere(1, 30, 30);
    this.indexCount = sphere.indices.length;

    const gl = this.gl;
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    const posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const normalBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
    const normalLoc = gl.getAttribLocation(this.program, "a_normal");
    gl.enableVertexAttribArray(normalLoc);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(this.program, "a_uv");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    const tangentBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.tangents, gl.STATIC_DRAW);
    const tangentLoc = gl.getAttribLocation(this.program, "a_tangent");
    gl.enableVertexAttribArray(tangentLoc);
    gl.vertexAttribPointer(tangentLoc, 3, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  async loadTextures() {
    let unit = 0;

    this.textures.surface = await this.utils.loadTexture(
      this.surfaceURL,
      unit++
    );

    if (this.normalMapURL) {
      this.textures.normal = await this.utils.loadTexture(
        this.normalMapURL,
        unit++
      );
    }

    if (this.specularURL) {
      this.textures.specular = await this.utils.loadTexture(
        this.specularURL,
        unit++
      );
    }

    if (this.atmosphereURL) {
      this.textures.atmosphere = await this.utils.loadTexture(
        this.atmosphereURL,
        unit++
      );
    }
  }

  updateRotation(deltaTime: number) {
    const qRotation = quat.setAxisAngle(
      quat.create(),
      this.axis,
      (this.rotationPerFrame * deltaTime) / 100
    );
    quat.multiply(this.spinQuat, qRotation, this.spinQuat);
    quat.multiply(this.rotationQuat, this.tiltQuat, this.spinQuat);
  }

  getBoundingInfo(): { modelMatrix: mat4; obbMin: vec3; obbMax: vec3 } {
    // The local-space bounding box of a unit UV sphere is [-1, -1, -1] to [1, 1, 1]
    return {
      modelMatrix: this.getModelMatrix(), // includes translation, scale, rotation
      obbMin: vec3.fromValues(-1, -1, -1), // unit UV sphere local bounds
      obbMax: vec3.fromValues(1, 1, 1),
    };
  }
  private updateModelMatrix() {
    mat4.fromRotationTranslationScale(
      this.modelMatrix,
      this.rotationQuat,
      this.position,
      this.scale
    );
  }

  render(
    viewMatrix: mat4,
    projectionMatrix: mat4,
    lightPos: vec3,
    cameraPos: vec3
  ) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao!);

    this.updateModelMatrix();
    const normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, this.modelMatrix);
    gl.uniformMatrix3fv(
      this.uniformLocations.normalMatrix,
      false,
      normalMatrix
    );
    gl.uniformMatrix4fv(this.uniformLocations.model, false, this.modelMatrix);
    gl.uniformMatrix4fv(this.uniformLocations.view, false, viewMatrix);
    gl.uniformMatrix4fv(
      this.uniformLocations.projection,
      false,
      projectionMatrix
    );
    gl.uniform3fv(this.uniformLocations.lightPos, lightPos);
    gl.uniform3fv(this.uniformLocations.viewPos, cameraPos);

    gl.uniform1i(this.uniformLocations.useNormal, this.textures.normal ? 1 : 0);
    gl.uniform1i(
      this.uniformLocations.useSpecular,
      this.textures.specular ? 1 : 0
    );
    gl.uniform1i(
      this.uniformLocations.useAtmosphere,
      this.textures.atmosphere ? 1 : 0
    );

    this.bindTextures();

    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    if (this.selected) {
      const gl = this.gl;
      gl.useProgram(this.glowProgram);
      gl.bindVertexArray(this.vao!);

      const glowModel = mat4.clone(this.modelMatrix);
      mat4.scale(glowModel, glowModel, [1.05, 1.05, 1.05]);

      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.glowProgram, "u_model"),
        false,
        glowModel
      );
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.glowProgram, "u_view"),
        false,
        viewMatrix
      );
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.glowProgram, "u_proj"),
        false,
        projectionMatrix
      );
      gl.uniform3fv(
        gl.getUniformLocation(this.glowProgram, "u_cameraPos"),
        cameraPos
      );

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.FRONT); // Backface only for outline
      gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    }

    this.axisHelper?.render(viewMatrix, projectionMatrix, this.modelMatrix);
  }

  static glowVert = `#version 300 es
  #
layout(location = 0) in vec3 a_position;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;

out vec3 v_worldPos;
out vec3 v_normal;

void main() {
    vec4 worldPos = u_model * vec4(a_position, 1.0);
    v_worldPos = worldPos.xyz;

    // Normal from model matrix (assuming uniform scale)
    v_normal = mat3(u_model) * a_position;

    gl_Position = u_proj * u_view * worldPos;
}`;

  static glowFrag = `#version 300 es
precision mediump float;

in vec3 v_worldPos;
in vec3 v_normal;

uniform vec3 u_cameraPos;

out vec4 fragColor;

void main() {
    vec3 viewDir = normalize(u_cameraPos - v_worldPos);
    vec3 normal = normalize(v_normal);

    // Fresnel term (dot gets small at edges)
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.0);

    // Smooth gradient and color
    vec3 glowColor = vec3(0.1, 0.8, 1.0); // Cyan-ish
    fragColor = vec4(glowColor * fresnel, fresnel * 0.8); // Alpha also scales with fresnel
}
`;

  private bindTextures() {
    const gl = this.gl;
    let textureUnit = 0;
    for (const [key, texture] of Object.entries(this.textures)) {
      if (texture && this.uniformLocations[key]) {
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(this.uniformLocations[key]!, textureUnit);
        textureUnit++;
      }
    }
  }

  getName() {
    return this.name;
  }
  getPosition() {
    return this.position;
  }

  getModelMatrix() {
    this.updateModelMatrix();
    let model = mat4.create();
    mat4.copy(model, this.modelMatrix);
    return model;
  }
  getRadius() {
    const scale = vec3.create();
    mat4.getScaling(scale, this.modelMatrix);
    return Math.max(...scale);
  }

  getNormalMatrix() {
    const normalMatrix = mat3.create();
    mat3.fromMat4(normalMatrix, this.modelMatrix);
    mat3.invert(normalMatrix, normalMatrix);
    mat3.transpose(normalMatrix, normalMatrix);
    return normalMatrix;
  }

  static vertexShaderSrc = `#version 300 es
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
  `;

  static fragmentShaderSrc = `#version 300 es
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
  `;
}
