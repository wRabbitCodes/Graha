import { AssetsLoader } from "../../../core/AssetsLoader";
import { GLUtils } from "../../../utils/GLUtils";
import { RenderContext } from "../../command/IRenderCommands";
import { Renderer } from "../../command/Renderer";
import { SkyStrategy } from "../../strategy/strategies/skyStrategy";
import { COMPONENT_STATE } from "../Component";
import { SkyRenderComponent } from "../components/RenderComponent";
import { Registry } from "../Registry";
import { System } from "../System";

export class SkyRenderSystem extends System {
  private strategy: SkyStrategy;
  constructor(
    public renderer: Renderer,
    private assetsLoader: AssetsLoader,
    registry: Registry,
    utils: GLUtils
  ) {
    super(registry, utils);
    this.strategy = new SkyStrategy(utils);
    this.strategy.initialize();
  }

  update(deltaTime: number) {
    for (const entity of this.registry.getEntitiesWith(SkyRenderComponent)) {
      const renderComp = this.registry.getComponent(entity, SkyRenderComponent);
      if (!renderComp) continue;

      const texture = this.assetsLoader.getTexture("sky");
      if (!texture) return;

      // Initialize if needed
      if (renderComp.state === COMPONENT_STATE.UNINITIALIZED) {
        this.initialize(renderComp);
      }

      if (renderComp.state !== COMPONENT_STATE.READY) continue;

      this.renderer.enqueue({
        execute: (gl: WebGL2RenderingContext, ctx: RenderContext) => {
          gl.useProgram(renderComp.program);
          gl.bindVertexArray(renderComp.VAO);
          this.strategy.setBindings(gl, ctx, {renderComp}, {texture})
          gl.depthFunc(gl.LEQUAL);
          gl.drawElements(
            gl.TRIANGLES,
            renderComp.sphereMesh!.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );
          gl.bindVertexArray(null);
        },
      });
    }
  }

  private initialize(renderComp: SkyRenderComponent) {

    renderComp.state = COMPONENT_STATE.LOADING;
    renderComp.sphereMesh = this.utils.createUVSphere(1, 64, 64, true);
    renderComp.program = this.strategy.getProgram();
    if (!renderComp.program || !renderComp.sphereMesh)
      return;

    this.setupVAO(renderComp);
    renderComp.state = COMPONENT_STATE.READY;
  }

  private setupVAO(renderComp: SkyRenderComponent) {
    const gl = this.utils.gl;
    const program = renderComp.program!;
    const mesh = renderComp.sphereMesh!;
    const VAO = gl.createVertexArray()!;

    gl.useProgram(this.strategy.getProgram());
    gl.bindVertexArray(VAO);

    const posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    renderComp.VAO = VAO;
  }
}
