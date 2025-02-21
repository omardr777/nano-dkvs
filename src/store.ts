export class Store {
  private store = new Map<string, string | number>();
  private servers = new Map<string, number>([
    ["127.0.0.1", 3000],
    ["127.0.0.1", 3001],
  ]);

  get getServers() {
    return this.servers;
  }

  register({ server = "127.0.0.1", port }: { server?: string; port: number }) {
    return this.servers.set(server, port);
  }

  unregister({
    server = "127.0.0.1",
    port,
  }: {
    server?: string;
    port: number;
  }) {
    return this.servers.delete(`${server}:${port}`);
  }

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

  show() {
    if (this.store.size === 0) {
      return "No data stored";
    }

    let result = "";

    for (const [key, value] of this.store) {
      result += `${key}: ${value}\n`;
    }
    return result;
  }
}
