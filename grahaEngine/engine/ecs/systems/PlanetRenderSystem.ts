import { GLUtils } from "../../../utils/GLUtils";
import { Registry } from "../Registry";
import { RenderContext } from "../../command/IRenderCommands";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { System } from "../System";
import { ModelComponent } from "../components/ModelComponent";
import { PlanetRenderComponent } from "../components/RenderComponent";
import { COMPONENT_STATE } from "../Component";
import { mat3, mat4, vec2, vec3 } from "gl-matrix";
import { AssetsLoader } from "../../../core/AssetsLoader";
import { Canvas } from "@/grahaEngine/core/Canvas";
import { SETTINGS } from "@/grahaEngine/config/settings";

export class PlanetRenderSystem extends System implements IRenderSystem {
  // USES TWO PASS FOR SHADOWS / INITAL RENDER TO FRAME BUFFER
  private shadowFrameBuffer: WebGLFramebuffer;
  private shadowDepthTexture: WebGLTexture;
  private atmosphereRotation = 0;
  private shadowProgram: WebGLProgram;
  private lightFrustumProgram: WebGLProgram;
  private depthTextureSize = 1024;
  private frustumVAO: WebGLVertexArrayObject;
  private wireCube;

  constructor(
    private canvas: Canvas,
    public renderer: Renderer,
    private assetsLoader: AssetsLoader,
    registry: Registry,
    utils: GLUtils,
  ) {
    super(registry, utils);
    const gl = this.utils.gl;
    this.shadowDepthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowDepthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.depthTextureSize, this.depthTextureSize, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);


    this.shadowFrameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFrameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowDepthTexture, 0);

    this.shadowProgram = this.utils.createProgram(
      `#version 300 es
      in vec4 a_position;

      uniform mat4 u_projection;
      uniform mat4 u_view;
      uniform mat4 u_world;

      void main() {
        // Multiply the position by the matrices.
        gl_Position = u_projection * u_view * u_world * a_position;
      }`,
      `#version 300 es
      precision highp float;

      void main() {
      }`
    );

    this.lightFrustumProgram = this.utils.createProgram(
      // simple vertex shader that takes a_position and applies model/view/proj
      `#version 300 es
      in vec3 a_position;
      uniform mat4 u_world;
      uniform mat4 u_view;
      uniform mat4 u_proj;
      void main() {
        gl_Position = u_proj * u_view * u_world * vec4(a_position, 1.0);
      }`,
      // simple fragment that paints white
      `#version 300 es
      precision highp float;
      out vec4 outColor;
      void main() {
        outColor = vec4(1,1,1,1);
      }`
    );

    this.wireCube = {
  position: new Float32Array([
    -1,-1,-1,  1,-1,-1,   1,1,-1,  -1,1,-1,
    -1,-1, 1,  1,-1, 1,   1,1, 1,  -1,1, 1,
  ]),
  indices: new Uint16Array([
    0,1, 1,2, 2,3, 3,0,    // bottom face
    4,5, 5,6, 6,7, 7,4,    // top face
    0,4, 1,5, 2,6, 3,7,    // side edges
  ]),
};
this.frustumVAO = gl.createVertexArray()!;
gl.bindVertexArray(this.frustumVAO);

// position buffer
const buf = gl.createBuffer()!;
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, this.wireCube.position, gl.STATIC_DRAW);
const loc = gl.getAttribLocation(this.lightFrustumProgram, "a_position");
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);

// index buffer
const ib = gl.createBuffer()!;
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.wireCube.indices, gl.STATIC_DRAW);

gl.bindVertexArray(null);
  }

  update(deltaTime: number): void {
    this.atmosphereRotation += (deltaTime / 45000) % 1.0;
    for (const entity of this.registry.getEntitiesWith(
      PlanetRenderComponent,
      ModelComponent
    )) {
      const modelComp = this.registry.getComponent(entity, ModelComponent);
      const renderComp = this.registry.getComponent(
        entity,
        PlanetRenderComponent
      );
      if (
        modelComp.state !== COMPONENT_STATE.READY ||
        !modelComp.isVisible
      ) {
        continue;
      }

      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED)
        this.initialize(renderComp);
      
      const entityName = this.registry.getNameFromEntityID(entity.id)!;
      const texComp = {
        surface: this.assetsLoader.getTexture(`${entityName.toLowerCase()}Surface`),
        normal: this.assetsLoader.getTexture(`${entityName.toLowerCase()}Normal`),
        specular: this.assetsLoader.getTexture(`${entityName.toLowerCase()}Specular`),
        atmosphere: this.assetsLoader.getTexture(`${entityName.toLowerCase()}Atmosphere`),
        night: this.assetsLoader.getTexture(`${entityName.toLowerCase()}Night`)
      };
      const lightProjectionMatrix = mat4.perspective(mat4.create(), Math.PI / 4, this.utils.gl.canvas.width/this.utils.gl.canvas.height, 0.1, SETTINGS.FAR_PLANE/ SETTINGS.DISTANCE_SCALE); // or perspective
      const lightViewMatrix = mat4.lookAt(mat4.create(), [0,0,0], modelComp.position!, [0,1,0]);

      const lightViewProj = mat4.create();
      mat4.multiply(lightViewProj, lightProjectionMatrix, lightViewMatrix);

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {

          gl.bindVertexArray(renderComp.VAO);
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFrameBuffer);
          gl.viewport(0, 0, this.depthTextureSize, this.depthTextureSize); // match your shadow map resolution
          gl.clear(gl.DEPTH_BUFFER_BIT);

          gl.useProgram(this.shadowProgram); // you'll need a minimal depth-only shader

          gl.bindVertexArray(renderComp.VAO);


          gl.uniformMatrix4fv(
            gl.getUniformLocation(this.shadowProgram, "u_projection"),
            false,
            lightProjectionMatrix
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(this.shadowProgram, "u_view"),
            false,
            lightViewMatrix,
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(this.shadowProgram, "u_world"),
            false,
            modelComp.modelMatrix
          );

          gl.enable(gl.CULL_FACE);
          gl.cullFace(gl.FRONT); // helps reduce shadow acne

          gl.drawElements(
            gl.TRIANGLES,
            renderComp.sphereMesh!.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );

          gl.disable(gl.CULL_FACE);

          gl.bindVertexArray(null);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        },
      });


      // RENDER PASS
      this.renderer.enqueue({
      execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
        // gl.clearColor(0.0, 0.0, 0.0, 1.0);
        // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(renderComp.program);
        gl.bindVertexArray(renderComp.VAO);

        // === Build Texture Matrix ===
        const textureMatrix = mat4.create();
        mat4.identity(textureMatrix);
        mat4.translate(textureMatrix, textureMatrix, [0.5, 0.5, 0.5]);
        mat4.scale(textureMatrix, textureMatrix, [0.5, 0.5, 0.5]);
        mat4.multiply(textureMatrix, textureMatrix, lightViewProj);

        // === Set Uniforms ===
        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, modelComp.modelMatrix);

        gl.uniformMatrix3fv(renderComp.uniformLocations.normalMatrix, false, normalMatrix);
        gl.uniformMatrix4fv(renderComp.uniformLocations.model, false, modelComp.modelMatrix);
        gl.uniformMatrix4fv(renderComp.uniformLocations.view, false, ctx.viewMatrix);
        gl.uniformMatrix4fv(renderComp.uniformLocations.projection, false, ctx.projectionMatrix);
        gl.uniform3fv(renderComp.uniformLocations.lightPos, ctx.lightPos);
        gl.uniform3fv(renderComp.uniformLocations.viewPos, ctx.cameraPos);

        // === Shadow-specific uniforms ===
        gl.uniformMatrix4fv(renderComp.uniformLocations.textureMatrix, false, textureMatrix);
        gl.uniform1f(renderComp.uniformLocations.shadowBias, 0.005); // Tunable bias

        console.log(this.shadowDepthTexture);
        gl.activeTexture(gl.TEXTURE5); // Choose texture unit
        gl.bindTexture(gl.TEXTURE_2D, this.shadowDepthTexture); // Assume ctx.shadowMap holds the depth texture
        gl.uniform1i(renderComp.uniformLocations.shadowMap, 5); // Tell GLSL which texture unit

        // === Flags ===
        gl.uniform1i(renderComp.uniformLocations.useNormal, texComp.normal ? 1 : 0);
        gl.uniform1i(renderComp.uniformLocations.useSpecular, texComp.specular ? 1 : 0);
        gl.uniform1i(renderComp.uniformLocations.useAtmosphere, texComp.atmosphere ? 1 : 0);
        gl.uniform1i(renderComp.uniformLocations.useNight, texComp.night ? 1 : 0);

        this.bindTextures(renderComp, texComp);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.drawElements(gl.TRIANGLES, renderComp.sphereMesh!.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.CULL_FACE);
        gl.bindVertexArray(null);
      }
    });


    // world matrix for the frustum: take the cube and transform it to represent
    // the light’s projection volume in world space.
    const invLightProj = mat4.invert(mat4.create(), mat4.multiply(mat4.create(), lightProjectionMatrix, lightViewMatrix));

    this.renderer.enqueue({
      execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
        gl.useProgram(this.lightFrustumProgram);
        gl.bindVertexArray(this.frustumVAO);

        // set uniforms
        gl.uniformMatrix4fv(gl.getUniformLocation(this.lightFrustumProgram, "u_world"), false, mat4.invert(mat4.create(),invLightProj));
        gl.uniformMatrix4fv(gl.getUniformLocation(this.lightFrustumProgram, "u_view"), false, ctx.viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.lightFrustumProgram, "u_proj"), false, ctx.projectionMatrix);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.drawElements(gl.LINES, this.wireCube.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
      },
    });


      if (!renderComp.atmosphereProgram || !texComp.atmosphere) continue;
      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.atmosphereProgram!);
          gl.bindVertexArray(renderComp.VAO);

          const atmosphereModel = mat4.clone(modelComp.modelMatrix);
          mat4.scale(atmosphereModel, atmosphereModel, [1.02, 1.02, 1.02]);

          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_model"),
            false,
            atmosphereModel
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_view"),
            false,
            ctx.viewMatrix
          );
          gl.uniformMatrix4fv(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_proj"),
            false,
            ctx.projectionMatrix
          );
          gl.uniform1f(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_rotation"),
            this.atmosphereRotation
          );
          gl.uniform1f(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_opacity"),
            0.3
          );
          gl.uniform1f(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_time"),
            Date.now() / 1000
          );
          gl.uniform1f(
            gl.getUniformLocation(renderComp.atmosphereProgram!, "u_fogDensity"),
            0.03
          );

          gl.activeTexture(gl.TEXTURE4);
          gl.bindTexture(gl.TEXTURE_2D, texComp.atmosphere!);
          gl.uniform1i(
            gl.getUniformLocation(
              renderComp.atmosphereProgram!,
              "u_atmosphereTexture"
            ),
            4
          );

          gl.enable(gl.CULL_FACE);
          gl.cullFace(gl.FRONT);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          gl.depthMask(false);

          gl.drawElements(
            gl.TRIANGLES,
            renderComp.sphereMesh!.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );

          gl.depthMask(true);
          gl.disable(gl.BLEND);
          gl.disable(gl.CULL_FACE);

          gl.bindVertexArray(null);
        }
      });
    }
  }

  private initialize(renderComp: PlanetRenderComponent) {
    renderComp.state = COMPONENT_STATE.LOADING;
    this.getUniformLocations(renderComp);
    renderComp.sphereMesh = this.utils.createUVSphere(1, 40, 40);
    this.setupVAO(renderComp);
    renderComp.state = COMPONENT_STATE.READY;
  }

  private getUniformLocations(renderComp: PlanetRenderComponent) {
    const gl = this.utils.gl;
    const program = renderComp.program!;
    renderComp.uniformLocations.normalMatrix = gl.getUniformLocation(
      program,
      "u_normalMatrix"
    );
    renderComp.uniformLocations.surface = gl.getUniformLocation(
      program,
      "u_surfaceTexture"
    );
    renderComp.uniformLocations.normal = gl.getUniformLocation(
      program,
      "u_normalTexture"
    );
    renderComp.uniformLocations.specular = gl.getUniformLocation(
      program,
      "u_specularTexture"
    );
    renderComp.uniformLocations.atmosphere = gl.getUniformLocation(
      program,
      "u_atmosphereTexture"
    );
    renderComp.uniformLocations.night = gl.getUniformLocation(
      program,
      "u_nightTexture"
    );
    renderComp.uniformLocations.model = gl.getUniformLocation(
      program,
      "u_model"
    );
    renderComp.uniformLocations.view = gl.getUniformLocation(program, "u_view");
    renderComp.uniformLocations.projection = gl.getUniformLocation(
      program,
      "u_proj"
    );
    renderComp.uniformLocations.lightPos = gl.getUniformLocation(
      program,
      "u_lightPos"
    );
    renderComp.uniformLocations.viewPos = gl.getUniformLocation(
      program,
      "u_viewPos"
    );
    renderComp.uniformLocations.useNormal = gl.getUniformLocation(
      program,
      "u_useNormal"
    );
    renderComp.uniformLocations.useSpecular = gl.getUniformLocation(
      program,
      "u_useSpecular"
    );
    renderComp.uniformLocations.useAtmosphere = gl.getUniformLocation(
      program,
      "u_useAtmosphere"
    );
    renderComp.uniformLocations.useNight = gl.getUniformLocation(
      program,
      "u_useNight"
    );
    renderComp.uniformLocations.atmosphereRotation = gl.getUniformLocation(
      program,
      "u_atmosphereRotation"
    );

    renderComp.uniformLocations.textureMatrix = gl.getUniformLocation(program, "u_textureMatrix");
    renderComp.uniformLocations.shadowMap = gl.getUniformLocation(program, "u_shadowMap");
    renderComp.uniformLocations.shadowBias = gl.getUniformLocation(program, "u_shadowBias");
  }

  private setupVAO(renderComp: PlanetRenderComponent) {
    const sphere = renderComp.sphereMesh!;
    const program = renderComp.program!;
    const gl = this.utils.gl;
    const VAO = gl.createVertexArray()!;
    gl.bindVertexArray(VAO);

    const posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const normalBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.normals, gl.STATIC_DRAW);
    const normalLoc = gl.getAttribLocation(program, "a_normal");
    gl.enableVertexAttribArray(normalLoc);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    const tangentBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.tangents, gl.STATIC_DRAW);
    const tangentLoc = gl.getAttribLocation(program, "a_tangent");
    gl.enableVertexAttribArray(tangentLoc);
    gl.vertexAttribPointer(tangentLoc, 3, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    renderComp.VAO = VAO;
  }

  private bindTextures(
    renderComp: PlanetRenderComponent,
    texComp: { [key: string]: WebGLTexture | undefined }
  ) {
    const gl = this.utils.gl;
    let idx = 0;
    Object.entries(texComp).forEach(([key, value]) => {
      if (value instanceof WebGLTexture) {
        gl.activeTexture(gl.TEXTURE0 + idx);
        gl.bindTexture(gl.TEXTURE_2D, value);
        gl.uniform1i(renderComp.uniformLocations[key], idx);
        idx++;
      }
    });
  }
}
