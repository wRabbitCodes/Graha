import { mat4, vec2, vec3 } from "gl-matrix";
import { Renderer, RenderPass } from "../../command/Renderer";
import { GLUtils } from "@/grahaEngine/utils/GLUtils";
import { COMPONENT_STATE } from "../Component";
import { EntitySelectionComponent } from "../components/EntitySelectionComponent";
import { ModelComponent } from "../components/ModelComponent";
import { TagRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";
import { SETTINGS } from "@/grahaEngine/config/settings";
import { OrbitComponent } from "../components/OrbitComponent";
import { TagStrategy } from "../../strategy/strategies/tagStrategy";
import { RenderContext } from "../../command/IRenderCommands";

export class SelectionTagSystem extends System {
  private tagStrategy: TagStrategy;
  constructor(public renderer: Renderer, registry: Registry, utils: GLUtils) {
    super(registry, utils);
    this.tagStrategy = new TagStrategy(utils);
    this.tagStrategy.initialize();
  }

  update(deltaTime: number): void {
    for (const entity of this.registry.getEntitiesWith(
      EntitySelectionComponent,
      ModelComponent
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
        this.initialize(entityName, renderComp);

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

          this.tagStrategy.setBindings(gl, ctx, { modelComp, renderComp });

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
        validate: (gl: WebGL2RenderingContext) => {
          return !!renderComp.program && !!renderComp.VAO && gl.getProgramParameter(renderComp.program!, gl.LINK_STATUS);
        },
        priority: RenderPass.TRANSPARENT,
        shaderProgram: renderComp.program,
        persistent: false,
      });
    }
  }

  private initialize(name: string, renderComp: TagRenderComponent) {
    this.setupVAO(renderComp);
    this.bindTextTexture(name, renderComp);
    renderComp.state = COMPONENT_STATE.READY;
    renderComp.program = this.tagStrategy.getProgram();
    renderComp.animationTime = 0.0; // Initialize animation time
  }

  private setupVAO(renderComp: TagRenderComponent) {
    const gl = this.utils.gl;
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, renderComp.popupQuad, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    renderComp.VAO = vao;
  }

  private bindTextTexture(name: string, component: TagRenderComponent) {
    const gl = this.utils.gl;
    const canvas = document.createElement("canvas");
    component.textCanvas = canvas;
    canvas.width = 512;
    canvas.height = 128;
    component.currentText = name;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `40px NeonSans`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#00ffff";
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);

    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    component.texture = tex;

    component.canvasSize = vec2.fromValues(canvas.width, canvas.height);
  }

  private updateTag(
    name: string,
    dt: number,
    renderComp: TagRenderComponent,
    modelComp: ModelComponent,
    orbitComp: OrbitComponent | null,
    cameraPos: vec3
  ) {
    // Update animation time independently of deltaTime
    renderComp.animationTime = (renderComp.animationTime + 0.016) % 10.0; // 60 FPS assumption (0.016s per frame), 10s cycle

    const scale = vec3.create();
    mat4.getScaling(scale, modelComp.modelMatrix);
    const radius = Math.max(...scale);

    const planetPos = modelComp.position!;
    const distToCamera = vec3.distance(cameraPos, planetPos);

    const threshold = orbitComp?.semiMajorAxis
      ? orbitComp.semiMajorAxis / SETTINGS.DISTANCE_SCALE
      : 100 * radius;
    const showFullText = distToCamera <= threshold;

    const textToDraw = showFullText ? name : name.charAt(0);

    const popupPos = vec3.create();
    vec3.set(popupPos, planetPos[0], planetPos[1] + radius, planetPos[2]);

    mat4.fromTranslation(renderComp.modelMatrix, popupPos);

    if (renderComp.currentText !== textToDraw) {
      this.updateTextTexture(renderComp, textToDraw);
      renderComp.currentText = textToDraw;
    }
  }

  private updateTextTexture(renderComp: TagRenderComponent, text: string) {
    if (!renderComp.textCanvas) {
      renderComp.textCanvas = document.createElement("canvas");
    }
    const canvas = renderComp.textCanvas;
    const ctx = canvas.getContext("2d")!;
    canvas.width = 512;
    canvas.height = 128;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `40px NeonSans`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#00ffff";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const gl = this.utils.gl;
    gl.bindTexture(gl.TEXTURE_2D, renderComp.texture!);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    renderComp.canvasSize = vec2.fromValues(canvas.width, canvas.height);
  }
}