import { createConnection, createServer, Server as TCPServer } from "net";
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
          command: string;
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
        command: "",
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
          const [command, key, value] = request.split(" ");
          const res = this.handleRequest(command, key, value);
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

  appendEntries(command: string) {
    this.logs.push({
      command,
      term: 1,
    });
  }

  syncEntries(address: [string, number]) {
    const [host, port] = address;
    const last = this.logs.length - 1;

    const client = createConnection({ host, port }, () => {
      client.write("sync:" + JSON.stringify(this.logs[last]));
    });
  }

  requestAppendEntries(command: string) {
    this.state === "leader" && this.appendEntries(command);

    for (const server of this.store.getServers) {
      server[1];
    }
  }

  handleRequest(command: string, key: string, value: string | number): string {
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
