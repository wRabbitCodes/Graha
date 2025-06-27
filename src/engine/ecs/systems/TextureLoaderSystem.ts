import { TextureComponent } from "../components/TextureComponent";
import { System } from "../System";
import { COMPONENT_STATE } from "../Component";

export class TextureLoaderSystem extends System {
  private finalTextureComp = new TextureComponent(); // Ensure Consistency between different texture sources;

  update(_: number): void {
    for (const entity of this.registry.getEntitiesWith(TextureComponent)) {
      const textureComponent = this.registry.getComponent(
        entity,
        TextureComponent
      );
      if (textureComponent.state !== COMPONENT_STATE.UNINITIALIZED) return;
      textureComponent.state = COMPONENT_STATE.LOADING;
      Promise.all([
        this.loadPlanetTexures(textureComponent),
        this.loadSkysphereTexture(textureComponent),
        this.loadSunTexture(textureComponent),
      ]).then(() => (this.finalTextureComp.state = COMPONENT_STATE.READY)).finally(()=>{
        this.registry.removeComponent(entity, TextureComponent);
        this.registry.addComponent(entity, this.finalTextureComp);
      });
    }
  }

  private async loadSunTexture(component: TextureComponent) {
    if (!component.sunURL) return;
    this.finalTextureComp.sun = await this.utils.loadTexture(
      component.sunURL,
      5
    );
  }

  private async loadSkysphereTexture(component: TextureComponent) {
    if (!component.skysphereURL) return;
    this.finalTextureComp.skysphere = await this.utils.loadTexture(
      component.skysphereURL,
      4
    );
  }

  private async loadPlanetTexures(component: TextureComponent) {
    if (!component.surfaceURL) return;

    this.finalTextureComp.surface = await this.utils.loadTexture(component.surfaceURL, 0)
    this.finalTextureComp.normal = await this.utils.loadTexture(component.surfaceURL, 1)
    this.finalTextureComp.specular = await this.utils.loadTexture(component.surfaceURL, 2)
    this.finalTextureComp.atmosphere = await this.utils.loadTexture(component.surfaceURL, 3)
  }
}
