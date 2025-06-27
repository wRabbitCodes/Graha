import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class SkysphereTextureComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;

  constructor(public skysphere: WebGLTexture, public skysphereURL: string) {}
}
