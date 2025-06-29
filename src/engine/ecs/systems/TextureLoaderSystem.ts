import { TextureComponent } from "../components/TextureComponent";
import { System } from "../System";
import { COMPONENT_STATE } from "../Component";

export class TextureLoaderSystem extends System {

  update(_: number): void {
    for (const entity of this.registry.getEntitiesWith(TextureComponent)) {
      const textureComponent = this.registry.getComponent(
        entity,
        TextureComponent
      );
      if (textureComponent.state !== COMPONENT_STATE.UNINITIALIZED) continue;
      textureComponent.state = COMPONENT_STATE.LOADING;
      Promise.all([
      this.loadPlanetTexures(textureComponent),
      this.loadSkysphereTexture(textureComponent),
      this.loadSunTexture(textureComponent),
      this.loadTagFont(textureComponent),
      ]).then(()=> textureComponent.state = COMPONENT_STATE.READY);

    }
  }

  private async loadSunTexture(component: TextureComponent) {
    if (!component.sunURL) return;
    component.sun = await this.utils.loadTexture(
      component.sunURL,
      16
    );
  }

  private async loadSkysphereTexture(component: TextureComponent) {
    if (!component.skysphereURL) return;
    component.skysphere = await this.utils.loadTexture(
      component.skysphereURL,
      15
    );
    component.state = COMPONENT_STATE.READY;
  }

  private async loadPlanetTexures(component: TextureComponent) {
    if (!component.surfaceURL) return;
    component.surface = await this.utils.loadTexture(component.surfaceURL, 0)
    if (component.normalURL) component.normal = await this.utils.loadTexture(component.normalURL, 1)
    if (component.specularURL) component.specular = await this.utils.loadTexture(component.specularURL, 2)
    if (component.atmosphereURL) component.atmosphere = await this.utils.loadTexture(component.atmosphereURL, 3)
    if (component.nightURL) component.night = await this.utils.loadTexture(component.nightURL, 4)
  }

  private async loadTagFont(component: TextureComponent) {
    if (component.tagFontFamily === undefined || component.tagFontURL === undefined) return;
    const font = new FontFace(component.tagFontFamily!, `url("${component.tagFontURL}")`);
    await font.load();
    (document as any).fonts.add(font);
  }
}
