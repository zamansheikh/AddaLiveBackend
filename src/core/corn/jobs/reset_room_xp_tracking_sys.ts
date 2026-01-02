import SocketServer from "../../sockets/socket_server";

export const resetRoomXPTrackingSystem = async () => {
  const socketInstance = SocketServer.getInstance();
  socketInstance.roomXpTrackingSystem = {};
  console.log("✅ Room XP Tracking Has Been Reset");
};
