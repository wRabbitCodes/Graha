export const SETTINGS = {
  GLOBAL_SCENE_SCALE: 10,
  CAMERA_SPEED: 3,
  MOUSE_SENSITIVITY: 0.1,
  BASE_DISTANCE_SCALE: 6e3,
  BASE_SIZE_SCALE: 2.5e2,
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
    return this.BASE_SUN_SIZE / this.SIZE_SCALE * 1.5;
  }
};
