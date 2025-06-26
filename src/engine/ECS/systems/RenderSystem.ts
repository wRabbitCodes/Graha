import { System } from "../System";
import { Registry } from "../Registry";
import { TransformComponent } from "../components/TransformComponent";
import { Renderer } from "../../Renderer";
import { RenderComponent } from "../components/RenderComponent";
import { RenderCommand } from "../RenderCommand";

export class PlanetRenderSystem extends System {
  constructor(private renderer: Renderer) {
    super();
  }

  update(registry: Registry, deltaTime: number): void {
    const entities = registry.getEntitiesWith(TransformComponent, RenderComponent);

    for (const entity of entities) {
      const transform = registry.getComponent(entity, TransformComponent)!;
      const render = registry.getComponent(entity, RenderComponent)!;

      const command = new RenderCommand({
        program: render.program,
        vao: render.vao,
        indexCount: render.indexCount,
        modelMatrix: transform.getModelMatrix(),
        normalMatrix: transform.getNormalMatrix(),
        textures: render.textures,
        uniformLocations: render.uniformLocations,
      });

      this.renderer.enqueue(command);
    }
  }
}
