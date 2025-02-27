import {
  createConnection,
  createServer,
  Socket,
  Server as TCPServer,
} from "net";
import { Store } from "./store";
import { State } from "./types/state";
import { Command, DistCommand, UserCommand } from "./types/commands";

export class Node {
  private server: TCPServer;
  private port: number;
  private store: Store;
  private state: State;
  private timer: number;
  private logs:
    | [
        {
          userCommand: string;
          term: number;
        }
      ];

  constructor(port: number = 8080) {
    this.port = port;
    this.store = new Store();
    this.state = port === 3000 ? "leader" : "follower";
    this.timer = 150;
    this.logs = [
      {
        userCommand: "",
        term: -1,
      },
    ];

    // this.store.register({ port: this.port });
    // console.log("Node created with port: ", this.port);

    this.server = createServer(socket => {
      console.log("Client connected");

      socket.on("data", data => {
        console.log("Data from the client: ", data.toString());
        const requests = this.readRequests(data.toString());
        for (const request of requests) {
          const [prefix, command, key, value] = request.split(" ");
          console.log("prefix: ", prefix);
          const res = this.handleRequest(
            prefix,
            command as Command,
            key,
            value
          );
          console.log("Response to the client: ", res);
          socket.write(res + "\r\n");
        }
      });

      socket.on("end", () => {
        // this.store.unregister({ port: this.port });
        console.log(
          `client with socket address: ${socket.localAddress}-${socket.localPort} has been disconnected!`
        );
      });

      socket.on("error", error => {
        console.error(error);
      });
    });
  }

  run() {
    this.server.listen(this.port, () => {
      console.log("server is running on port: ", this.port);
    });
  }

  close() {
    this.server.close(() => {
      console.log("server is closed");
    });
  }

  readRequests(data: string) {
    return data.split("\r\n").filter(request => request !== "");
  }

  appendEntries(
    userCommand: UserCommand,
    { key, value }: { key: string; value: any }
  ): string {
    this.logs.push({
      userCommand,
      term: 1,
    });
    switch (userCommand) {
      case "set":
        return this.store.set(key, value) || "OK";
      case "get": {
        const result = this.store.get(key);
        return result ? result.toString() : "Key not found";
      }
      case "delete": {
        const wasDeleted = this.store.delete(key);
        return wasDeleted ? "Deleted" : "Key not found";
      }
      case "show":
        return this.store.show();
      default:
        return "Invalid command";
    }
  }

  syncEntries(address: [string, number]) {
    const [host, port] = address;
    const last = this.logs.length - 1;

    const client = createConnection({ host, port }, () => {
      client.write("dist: " + JSON.stringify(this.logs[last]));
    });
  }

  getClients(): Socket[] {
    let availableServers = [];
    for (const server of this.store.getServers) {
      const [host, port] = server;

      const client = createConnection({ host, port });
      if (client.writable) {
        availableServers.push(client);
      }
    }

    if (!availableServers) throw new Error("No Available Connections");

    return availableServers;
  }

  checkMajority(clients: Socket[]): boolean {
    return clients.length >= Math.ceil(this.store.getServers.size / 2);
  }

  requestAppendEntries(
    command: UserCommand,
    userKeyValue: { key: string; value: any }
  ): string {
    // if follower will return undefined
    const clients = this.getClients();

    if (!this.checkMajority(clients)) {
      throw new Error("Not enough servers available");
    }

    const res = this.appendEntries(command, userKeyValue);
    // TODO: make it parallel
    for (const server of this.store.getServers) {
      // this is append rpc
      this.syncEntries(server);
    }
    return res;
  }

  handleRequest(prefix: string, command: Command, key: string, value: string) {
    if (prefix === "dist:") {
      this.distRequest(command as DistCommand, value);
    } else if (prefix === "user:") {
      console.log("user request", command, key, value);
      return this.userRequest(command as UserCommand, key, value);
    } else {
      throw Error("dz omha");
    }
  }

  distRequest(command: "append" | "vote", value: string) {
    switch (command) {
      case "append": {
        // this.appendEntries(value);
      }
      case "vote": {
        //TODO: implement election
        return;
      }
    }
  }

  // TODO: this shouldnt exist for followers
  userRequest(
    command: UserCommand,
    key: string,
    value: string | number
  ): string {
    // if (this.state !== "leader") return "TODO: proxy req to leader";
    return this.requestAppendEntries(command, { key, value });
  }
}
