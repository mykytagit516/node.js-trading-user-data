export default class Cache {
  constructor() {
    this.cache = {};
  }

  add(key, value) {
    this.cache[key] = value;
  }

  get(key) {
    return this.cache[key];
  }

  keys() {
    return Object.keys(this.cache);
  }

  remove(key) {
    delete this.cache[key];
  }

  clear() {
    this.cache = {};
  }
}
