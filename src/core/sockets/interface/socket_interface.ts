import { Socket } from "socket.io";

export interface ISocketHandler {
  register(socket: Socket): void;
}
