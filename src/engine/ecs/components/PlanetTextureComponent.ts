import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class PlanetTextureComponent implements IComponent, IState {
    state = COMPONENT_STATE.UNINITIALIZED;
    surface?: WebGLTexture;
    normal?: WebGLTexture;
    specular?: WebGLTexture;
    atmosphere?: WebGLTexture;

    constructor(
        public surfaceURL: string,
        public normalURL?: string,
        public specularURL?: string,
        public atmosphereURL?: string,
    ) {}        
}