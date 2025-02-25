import {
  createConnection,
  createServer,
  Socket,
  Server as TCPServer,
} from "net";
import { Store } from "./store";
import { State } from "./types/state";

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
          const res = this.handleRequest(prefix, command, key, value);
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

  readDistributed() {}

  appendEntries(userCommand: string) {
    if (this.state !== "leader") {
      return;
    }

    this.logs.push({
      userCommand,
      term: 1,
    });
  }

  syncEntries(address: [string, number]) {
    const [host, port] = address;
    const last = this.logs.length - 1;

    const client = createConnection({ host, port }, () => {
      client.write("dist: " + JSON.stringify(this.logs[last]));
    });
  }

  heartBeat(): Socket[] {
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

  requestAppendEntries(command: string) {
    // if follower will return undefined
    const clients = this.heartBeat();

    // early escape if no clients
    if (!clients) return;

    // TODO: make it parallel
    for (const server of this.store.getServers) {
      // this is append rpc
      this.syncEntries(server);
    }
    this.state === "leader" && this.appendEntries(command);
  }

  handleRequest(prefix: string, command: string, key: string, value: string) {
    if (prefix === "dist:") {
      this.distRequest(command as "append" | "vote", value);
    } else if (prefix === "user:") {
      this.userRequest(command, key, value);
    } else {
      throw Error("dz omha");
    }
  }

  distRequest(command: "append" | "vote", value: string) {
    switch (command) {
      case "append": {
        this.appendEntries(value);
      }
      case "vote": {
        //TODO: implement election
        return;
      }
    }
  }

  // TODO: this shouldnt exist for followers
  userRequest(command: string, key: string, value: string | number): string {
    if (this.state !== "leader") return "TODO: proxy req to leader";
    switch (command) {
      case "set":
        this.requestAppendEntries(command);
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
}
