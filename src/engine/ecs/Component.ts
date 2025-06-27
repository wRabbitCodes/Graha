export enum COMPONENT_STATE {
  UNINITIALIZED = "UNINITIALIZED",
  LOADING = "LOADING",
  READY = "READY",
  ERROR = "ERROR",
}

export interface IState {
  state: COMPONENT_STATE;
}
export interface IComponent {}
