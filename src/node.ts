import { createServer, Server as TCPServer } from "net";
import { Store } from "./store";

export class Node {
  private server: TCPServer;
  private port: number;
  private store: Store;

  constructor(port: number = 5000) {
    this.port = port;
    this.store = new Store();
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

  handleRequest(command: string, key: string, value: string | number): string {
    switch (command) {
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
      default:
        return "Invalid command";
    }
  }
}
