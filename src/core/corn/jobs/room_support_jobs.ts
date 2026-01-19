import SocketServer from "../../sockets/socket_server";
import { ROOM_LEVEL_CRITERIA } from "../../Utils/constants";
import { SocketAudioChannels } from "../../Utils/enums";
import { socketResponse } from "../../Utils/helper_functions";

export const roomSupportRewardSystem = async () => {
  console.log("room support reward system " + new Date().toLocaleString());
  const socketInstance = SocketServer.getInstance();
  socketInstance.roomSupportHistory = {}; // reset the history
  const hostedRooms = socketInstance.hostedAudioRooms;
  // loop through each room and provide their reward
  for (const [roomId, room] of Object.entries(hostedRooms)) {
    // creating history
    socketInstance.roomSupportHistory[roomId] = {
      roomVisitors: room.uniqueUsers.size,
      roomTransactions: room.roomTotalTransaction,
      roomLevel: room.roomLevel,
      rewardCoin:
        room.roomLevel == 0
          ? 0
          : ROOM_LEVEL_CRITERIA[room.roomLevel - 1].totalRewardCoin,
    };
    if (room.roomLevel == 0) continue;
    const reward = ROOM_LEVEL_CRITERIA[room.roomLevel - 1];
    const statsRepo = socketInstance.userStatsRepo;
    try {
      // provide owner coin
      await statsRepo.updateCoins(
        room.hostDetails!._id.toString(),
        reward.ownerCoin,
      );
      // update the host coins
      const ownerSocket = socketInstance.getSocketId(
        room.hostDetails!._id.toString(),
      );
      if (ownerSocket)
        socketResponse(
          socketInstance.getIO(),
          SocketAudioChannels.RoomSupportReward,
          ownerSocket,
          {
            success: true,
            message: "Successfully updated host coins",
            data: {
              hostBonus: room.hostBonus + reward.ownerCoin,
              roomTotalTransaction: room.roomTotalTransaction,
            },
          },
        );
      // provide partner coin
      for (let i = 0; i < room.roomPartners.length; i++) {
        await statsRepo.updateCoins(
          room.roomPartners[i]._id.toString(),
          reward.partnerCoin,
        );
        const partnerSocket = socketInstance.getSocketId(
          room.roomPartners[i]._id.toString(),
        );
        if (partnerSocket)
          socketResponse(
            socketInstance.getIO(),
            SocketAudioChannels.RoomSupportReward,
            partnerSocket,
            {
              success: true,
              message: "Successfully updated partner coins",
              data: {
                partnerId: room.roomPartners[i]._id.toString(),
                coins: reward.partnerCoin,
              },
            },
          );
      }
    } catch (error) {
      console.log(error);
    }
  }
};
