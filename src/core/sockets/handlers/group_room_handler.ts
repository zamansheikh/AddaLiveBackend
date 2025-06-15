import { Socket, Server } from 'socket.io';
import { SocketChannels } from '../../Utils/enums';
import { StatusCodes } from 'http-status-codes';

interface RoomData {
    hostId: string;
    members: Set<string>;
    bannedUsers: Set<string>;
}

const hostedRooms: Record<string, RoomData> = {};

export function registerGroupRoomHandler(io: Server, socket: Socket) {
    const userId = socket.handshake.query.userId as string;
    

    // host
    socket.on(SocketChannels.createRoom, (roomId) => {
        const room = hostedRooms[roomId];
        if (room) return io.emit(SocketChannels.error, { status: StatusCodes.CONFLICT, message: "Room Already Exists" });

        hostedRooms[roomId] = {
            hostId: socket.id,
            members: new Set([socket.id]),
            bannedUsers: new Set()
        };
        socket.join(roomId);

        // ! if unintended users are also getting the event, use io.to(roomId), 
        io.emit(SocketChannels.roomList, Object.keys(hostedRooms));
    });

    socket.on(SocketChannels.deleteRoom, (roomId) => {
        const room = hostedRooms[roomId];
        if (!room) return io.emit(SocketChannels.error, { status: StatusCodes.NOT_FOUND, message: "Room doest not exists" });
        if (room.hostId != socket.id) return io.emit(SocketChannels.error, { status: StatusCodes.UNAUTHORIZED, message: "You are not host of this room" });
        io.to(roomId).emit(SocketChannels.roomClosed, {
            roomId,
            message: "Room has been closed by the host",
        });
        for (const memberSocketId of room.members) {
            const memberSocket = io.sockets.sockets.get(memberSocketId);
            memberSocket?.leave(roomId);
        }
        delete hostedRooms[roomId];

        // ! if unintended users are also getting the event, use io.to(roomId), 
        io.emit(SocketChannels.roomList, Object.keys(hostedRooms));
    });

    // user only
    socket.on(SocketChannels.joinRoom, (roomId) => {
        const room = hostedRooms[roomId];
        if (!room) return io.emit(SocketChannels.error, { status: StatusCodes.NOT_FOUND, message: "This room does not exists" });
        if (room.bannedUsers.has(socket.id)) return io.emit(SocketChannels.error, { status: StatusCodes.UNAUTHORIZED, message: "You are banned from this room" });
        room.members.add(socket.id);
        socket.join(roomId);

        io.to(roomId).emit(SocketChannels.userJoined, socket.id);
    });

    socket.on(SocketChannels.leaveRoom, (roomId) => {
        const room = hostedRooms[roomId];
        if (!room) return io.emit(SocketChannels.error, { status: StatusCodes.NOT_FOUND, message: "This room does not exists" });
        room.members.delete(socket.id);
        socket.leave(roomId);

        io.to(roomId).emit(SocketChannels.userLeft, socket.id);
    });

    socket.on(SocketChannels.getRooms, () => {
        io.emit(SocketChannels.roomList, Object.keys(hostedRooms));
    });

    // host only
    socket.on(SocketChannels.banUser, ({ roomId, targetId }) => {

    });

    socket.on(SocketChannels.inviteUser, ({ roomId, targetId }) => { });


}