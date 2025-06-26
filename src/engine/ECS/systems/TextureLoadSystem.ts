import { GLUtils } from "../../../core/GLUtils";
import { COMPONENT_STATE } from "../../iState";
import { PlanetTextureComponent } from "../components/PlanetTextureComponent";
import { SkysphereTextureComponent } from "../components/SkysphereTextureComponent";
import { Registry } from "../Registry";
import { System } from "../System";

export class TextureLoader extends System {
  constructor(private gl: WebGL2RenderingContext, private utils: GLUtils) {
    super();
  }

  update(registry: Registry, _: number): void {
    for (const entity of registry.getEntitiesWith(PlanetTextureComponent, SkysphereTextureComponent)) {
      const textureComponent = registry.getComponent(entity, PlanetTextureComponent);
      const skysphereComponent = registry.getComponent(entity, SkysphereTextureComponent);
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

    }
  }

  private async loadPlanetTexures(component: PlanetTextureComponent) {
    if (component.state !== COMPONENT_STATE.UNINITIALIZED) return;
    component.state = COMPONENT_STATE.LOADING;
    let promises = [];
    if (component.surfaceURL)
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
              component.surfaceTexture = result.value;
              break;
            case 1:
              component.normalTexture = result.value;
              break;
            case 2:
              component.specularTexture = result.value;
              break;
            case 3:
              component.atmosphereTexture = result.value;
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
