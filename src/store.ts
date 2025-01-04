export class Store {
  private store = new Map<string, string | number>();
  set(key: string, value: string | number) {
    this.store.set(key, value);
    return `${key} set to ${value}`;
  }

  get(key: string) {
    return this.store.get(key);
  }

  delete(key: string) {
    return this.store.delete(key);
  }
}
