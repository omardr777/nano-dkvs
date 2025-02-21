import { Node } from "./node";

const node = new Node(Number(process.argv[2]) || 8080);

node.run();
