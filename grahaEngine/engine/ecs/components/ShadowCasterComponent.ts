import { mat4 } from "gl-matrix";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class ShadowCasterComponent implements IComponent, IState{
  state = COMPONENT_STATE.UNINITIALIZED;
  size = 1024;
  lightViewProj = mat4.create();
  shadowMapTex?: WebGLTexture;
  framebuffer?: WebGLFramebuffer;
}
