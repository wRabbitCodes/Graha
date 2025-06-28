export enum COMPONENT_STATE {
  STABLE = "STABLE",
  UNINITIALIZED = "UNINITIALIZED",
  LOADING = "LOADING",
  READY = "READY",
  ERROR = "ERROR",
}

export interface IState {
  state: COMPONENT_STATE;
}
export interface IComponent {}
