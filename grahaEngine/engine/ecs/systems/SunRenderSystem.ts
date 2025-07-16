import { AssetsLoader } from "../../../core/AssetsLoader";
import { GLUtils } from "../../../utils/GLUtils";
import { RenderContext, IRenderCommand } from "../../command/IRenderCommands"; // Use new IRenderCommands
import { Renderer, RenderPass } from "../../command/Renderer"; // Use new Renderer
import { SunStrategy } from "../../strategy/strategies/sunStrategy";
import { COMPONENT_STATE } from "../Component";
import { SunRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";

export class SunRenderSystem extends System {
  private sunStrategy: SunStrategy;

  constructor(
    public renderer: Renderer,
    private assetsLoader: AssetsLoader,
    registry: Registry,
    utils: GLUtils
  ) {
    super(registry, utils);
    this.sunStrategy = new SunStrategy(utils);
    this.sunStrategy.initialize();
  }

  update(deltaTime: number): void {
    const entity = this.registry.getEntityByID(this.registry.getEntityIdFromName('sun'))!;
    const renderComp = this.registry.getComponent(entity, SunRenderComponent);
    const texture = this.assetsLoader.getTexture("sun");
    if (!texture) return;
    if (renderComp.state === COMPONENT_STATE.UNINITIALIZED)
      this.initialize(renderComp);
    if (renderComp.state !== COMPONENT_STATE.READY) return;

    this.renderer.enqueue({
      execute: (gl: WebGL2RenderingContext, ctx: Partial<RenderContext>) => {
        gl.useProgram(renderComp.program);
        this.sunStrategy.setBindings(gl, ctx, {}, { sunTexture: texture });
        // Set uniforms
        // gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        gl.bindVertexArray(renderComp.VAO);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null);

        gl.disable(gl.BLEND);
        gl.depthMask(true);
        // gl.enable(gl.DEPTH_TEST);
      },
      validate: (gl: WebGL2RenderingContext) => !!renderComp.program && gl.getProgramParameter(renderComp.program, gl.LINK_STATUS),
      priority: RenderPass.TRANSPARENT,
      shaderProgram: renderComp.program,
      persistent: false
    });
  }

  private initialize(renderComp: SunRenderComponent) {
    renderComp.state = COMPONENT_STATE.LOADING;
    this.setupVAO(renderComp);
    renderComp.state = COMPONENT_STATE.READY;
  }

  private setupVAO(renderComp: SunRenderComponent) {
    const gl = this.utils.gl;
    const vao = gl.createVertexArray()!;
    renderComp.program = this.sunStrategy.getProgram();
    gl.useProgram(renderComp.program);
    gl.bindVertexArray(vao);
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(renderComp.program!, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    renderComp.VAO = vao;
  }
}