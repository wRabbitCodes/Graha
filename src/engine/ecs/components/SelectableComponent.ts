import { COMPONENT_STATE, IComponent, IState } from "../Component";

export class SelectableComponent implements IComponent, IState {
  state = COMPONENT_STATE.STABLE;
  isSelected = false;
}