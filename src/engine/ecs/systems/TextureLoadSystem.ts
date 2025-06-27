import { PlanetTextureComponent } from "../components/PlanetTextureComponent";
import { System } from "../System";
import { SkysphereTextureComponent } from "../components/SkysphereTextureComponent";
import { COMPONENT_STATE } from "../Component";

export class TextureLoadSystem extends System {

  update(_: number): void {
    for (const entity of this.registry.getEntitiesWith(PlanetTextureComponent, SkysphereTextureComponent)) {
      const textureComponent = this.registry.getComponent(entity, PlanetTextureComponent);
      const skysphereComponent = this.registry.getComponent(entity, SkysphereTextureComponent);
      if (textureComponent.state == COMPONENT_STATE.UNINITIALIZED) this.loadPlanetTexures(textureComponent);
      if (skysphereComponent.state == COMPONENT_STATE.UNINITIALIZED) this.loadSkysphereTexture(skysphereComponent);
    }
  }

  private async loadSkysphereTexture(component: SkysphereTextureComponent){
    if (component.state !== COMPONENT_STATE.UNINITIALIZED) return;
    component.state = COMPONENT_STATE.LOADING;
    try {
        await this.utils.loadTexture(component.skysphereURL, 0);
    } catch (_) {
      component.state = COMPONENT_STATE.ERROR;
    }
  }

  private async loadPlanetTexures(component: PlanetTextureComponent) {
    if (component.state !== COMPONENT_STATE.UNINITIALIZED) return;
    component.state = COMPONENT_STATE.LOADING;
    let promises = [];
    promises.push(this.utils.loadTexture(component.surfaceURL, 0));
    if (component.normalURL)
      promises.push(this.utils.loadTexture(component.normalURL, 1));
    if (component.specularURL)
      promises.push(this.utils.loadTexture(component.specularURL, 2));
    if (component.atmosphereURL)
      promises.push(this.utils.loadTexture(component.atmosphereURL, 3));
    Promise.allSettled(promises)
      .then((results) =>
        results.forEach((result, index) => {
          if (result.status !== "fulfilled") return;
          switch (index) {
            case 0:
              component.surface = result.value;
              break;
            case 1:
              component.normal = result.value;
              break;
            case 2:
              component.specular = result.value;
              break;
            case 3:
              component.atmosphere = result.value;
              break;
            default:
              break;
          }
        })
      )
      .catch(()=>component.state = COMPONENT_STATE.ERROR)
      .finally(() => (component.state = COMPONENT_STATE.READY));
  }
}
