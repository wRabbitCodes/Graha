import mitt from "mitt";

export enum GRAHA_ENGINE_EVENTS {
  SELECTED_ENTITIES = "SELECTED_ENTITIES",
  SPEED_UPDATE = "SPEED_UPDATE",
  DISTANCE_UPDATE = "DISTANCE_UPDATE",
  SYSTEM_CHANGE = "SYSTEM_CHANGE",
}

type Events = {
  [GRAHA_ENGINE_EVENTS.SELECTED_ENTITIES]: { names: string[] };
  [GRAHA_ENGINE_EVENTS.SPEED_UPDATE]: { speed: string };
  [GRAHA_ENGINE_EVENTS.DISTANCE_UPDATE]: { distance: string };
  [GRAHA_ENGINE_EVENTS.SYSTEM_CHANGE]: { systemName: string };
};

const grahaEvents = mitt<Events>();
export default grahaEvents;