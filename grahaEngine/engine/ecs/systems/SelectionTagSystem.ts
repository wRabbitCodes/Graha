import { mat4, vec2, vec3 } from "gl-matrix";
import { GLUtils } from "../../../utils/GLUtils";
import { IRenderSystem } from "../../command/IRenderSystem";
import { Renderer } from "../../command/Renderer";
import { COMPONENT_STATE } from "../Component";
import { EntitySelectionComponent } from "../components/EntitySelectionComponent";
import { ModelComponent } from "../components/ModelComponent";
import { TagRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { RenderContext } from "../../command/IRenderCommands";
import { SETTINGS } from "../../../config/settings";
import { OrbitComponent } from "../components/OrbitComponent";
import { TagStrategy } from "../../strategy/strategies/tagStrategy";

export class SelectionTagSystem extends System implements IRenderSystem {
  private tagStrategy: TagStrategy;
  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
    this.tagStrategy = new TagStrategy(utils);
  }

  update(deltaTime: number): void {
    for (const entity of this.registry.getEntitiesWith(
      EntitySelectionComponent,
      ModelComponent,
    )) {
      const selectionComp = this.registry.getComponent(
        entity,
        EntitySelectionComponent
      );
      if (selectionComp?.state !== COMPONENT_STATE.READY) continue;
      if (!selectionComp?.isSelected) {
        this.registry.removeComponent(entity, TagRenderComponent);
        continue;
      }

      const modelComp = this.registry.getComponent(entity, ModelComponent);
      if (modelComp.state !== COMPONENT_STATE.READY) continue;

      const orbitComp = this.registry.getComponent(entity, OrbitComponent);

      let renderComp = this.registry.getComponent(entity, TagRenderComponent);
      if (!renderComp) {
        renderComp = new TagRenderComponent();
        this.registry.addComponent(entity, renderComp);
      }
      const entityName = this.registry.getNameFromEntityID(entity.id) || "";
      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED)
        this.initialize(entityName, modelComp, renderComp);

      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          this.updateTag(
            entityName,
            deltaTime,
            renderComp,
            modelComp,
            orbitComp,
            ctx.cameraPos
          );

          this.tagStrategy.setBindings(gl, ctx, {modelComp, renderComp});

          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          gl.disable(gl.DEPTH_TEST);
          gl.useProgram(renderComp.program);
          gl.bindVertexArray(renderComp.VAO);    

          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

          gl.enable(gl.DEPTH_TEST);
          gl.disable(gl.BLEND);
          gl.bindVertexArray(null);
        },
      });
    }
  }

  private initialize(
    name: string,
    modelComp: ModelComponent,
    renderComp: TagRenderComponent
  ) {
    this.setupVAO(renderComp);
    this.bindTextTexture(name, modelComp, renderComp);
    renderComp.state = COMPONENT_STATE.READY;
  }

  private setupVAO(renderComp: TagRenderComponent) {
    const gl = this.utils.gl;
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, renderComp.popupQuad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    renderComp.VAO = vao;
  }

  private bindTextTexture(
    name: string,
    modelComp: ModelComponent,
    component: TagRenderComponent
  ) {
    const gl = this.utils.gl;
    const canvas = document.createElement("canvas");
    component.textCanvas = canvas;
    canvas.width = 1024;
    canvas.height = 256;
    component.currentText = name;
    // Load the local font
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `120px NeonSans`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4; // strokeText outline width
    ctx.shadowBlur = 0; // Disable blur
    ctx.fillStyle = "#00ffff"; // Neon cyan color
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);

    // === Upload to GPU ===
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    component.texture = tex;
  }

  private updateTag(
    name: string,
    dt: number,
    renderComp: TagRenderComponent,
    modelComp: ModelComponent,
    orbitComp: OrbitComponent,
    cameraPos: vec3
  ) {
    renderComp.time += dt / 500;

    const scale = vec3.create();
    mat4.getScaling(scale, modelComp.modelMatrix);
    const radius = Math.max(...scale);

    // Calculate distance from camera to planet center
    const planetPos = modelComp.position!;
    const distToCamera = vec3.distance(cameraPos, planetPos);

    // Decide text content based on distance threshold
    const threshold = orbitComp?.semiMajorAxis
      ? orbitComp.semiMajorAxis / SETTINGS.DISTANCE_SCALE
      : 100 * radius;
    const showFullText = distToCamera <= threshold;

    const textToDraw = showFullText
      ? name
      : name.charAt(0);

    // Only update texture if text content changed (optional optimization)
    if (renderComp.currentText !== textToDraw) {
      this.updateTextTexture(renderComp, textToDraw);
      renderComp.currentText = textToDraw;
    }

    // Set size of quad roughly proportional to radius + text width
    vec2.set(
      renderComp.size,
      radius + (renderComp.textCanvas?.width ?? 0),
      radius + (renderComp.textCanvas?.height ?? 0)
    );

    // Position label just above planet surface (no additional offset here)
    const popupPos = vec3.create();
    vec3.set(popupPos, planetPos[0], planetPos[1] + radius, planetPos[2]);
    mat4.fromTranslation(renderComp.modelMatrix, popupPos);
  }

  private updateTextTexture(renderComp: TagRenderComponent, text: string) {
    if (!renderComp.textCanvas) {
      renderComp.textCanvas = document.createElement("canvas");
    }
    const canvas = renderComp.textCanvas;
    const ctx = canvas.getContext("2d")!;
    canvas.width = 1024; // keep size large for quality
    canvas.height = 256;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `120px NeonSans`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#00ffff"; // neon cyan fill
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 10;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const gl = this.utils.gl;
    gl.bindTexture(gl.TEXTURE_2D, renderComp.texture!);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
}
