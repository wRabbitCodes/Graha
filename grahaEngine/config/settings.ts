export const SETTINGS = {
  MAX_LATCHED_RADIUS: 5e4,
  CAMERA_RADIUS: 10,
  GLOBAL_SCENE_SCALE: 50,
  CAMERA_SPEED: 0.05,
  MOUSE_SENSITIVITY: 0.001,
  BASE_DISTANCE_SCALE: 1e4,
  BASE_SIZE_SCALE: 4e2,
  BASE_FAR_PLANE: 5e11,
  BASE_SUN_SIZE: 7e6, // 7e5 actual but texture only contains 10% sun

  get DISTANCE_SCALE() {
    return this.GLOBAL_SCENE_SCALE * this.BASE_DISTANCE_SCALE;
  },

  get SIZE_SCALE() {
    return this.GLOBAL_SCENE_SCALE * this.BASE_SIZE_SCALE;
  },

  get FAR_PLANE() {
    return this.GLOBAL_SCENE_SCALE * this.BASE_FAR_PLANE;
  },

  get SUN_SIZE() {
    // return this.BASE_SUN_SIZE / this.SIZE_SCALE * 1.5;
    return 7e5 / this.SIZE_SCALE * 10;
  },
};
