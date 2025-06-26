import { COMPONENT_STATE, IState } from "../../iState";
import { IComponent } from "../iComponent";

export class SkysphereTextureComponent implements IComponent, IState{
    state = COMPONENT_STATE.UNINITIALIZED;
    skysphereTexture?: WebGL2RenderingContext;

    constructor(
        public skysphereURL: string
    ) {}    
}