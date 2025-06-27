import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class TextureComponent implements IComponent, IState {
    state = COMPONENT_STATE.UNINITIALIZED;
    surface?: WebGLTexture;
    normal?: WebGLTexture;
    specular?: WebGLTexture;
    atmosphere?: WebGLTexture;
    skysphere?: WebGLTexture;
    sun?: WebGLTexture;
    
    skysphereURL?: string;
    sunURL?: string;
    surfaceURL?: string;
    normalURL?: string;
    specularURL?: string;
    atmosphereURL?: string;
}