import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class PlanetTagComponent implements IComponent, IState {
  state: COMPONENT_STATE = COMPONENT_STATE.UNINITIALIZED;
  name: string = "";
  selected = false;
}