import { COMPONENT_STATE, IState } from "../../iState";
import { IComponent } from "../iComponent";

export class PlanetTextureComponent implements IComponent, IState {
    state = COMPONENT_STATE.UNINITIALIZED;
    surfaceTexture?: WebGLTexture;
    normalTexture?: WebGLTexture;
    specularTexture?: WebGLTexture;
    atmosphereTexture?: WebGLTexture;

    constructor(
        public surfaceURL: string,
        public normalURL: string,
        public specularURL?: string,
        public atmosphereURL?: string,
    ) {}        
}