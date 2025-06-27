import { SphereMesh } from "../../utils/GLUtils";
import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class RenderComponent implements IComponent, IState {
  state = COMPONENT_STATE.UNINITIALIZED;
  constructor(
    public program: WebGLProgram | null = null,
    public textures?: { [key: string]: WebGLTexture | null },
    public uniformLocations: { [key: string]: WebGLUniformLocation | null }= {},  
    public VAO: WebGLVertexArrayObject | null = null,
    public sphereMesh?: SphereMesh,
  ) {}
}

export class PlanetRenderComponent extends RenderComponent {}

export class SkyRenderComponent extends RenderComponent{}