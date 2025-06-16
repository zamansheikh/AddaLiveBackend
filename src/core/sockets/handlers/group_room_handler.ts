import { Socket, Server } from 'socket.io';
import { SocketChannels } from '../../Utils/enums';
import { StatusCodes } from 'http-status-codes';
import { RoomData } from '../socket_server';




export function registerGroupRoomHandler(io: Server, socket: Socket, onlineUsers: Map<string, string>, hostedRooms: Record<string, RoomData>) {
    const userId = socket.handshake.query.userId as string;


    // host
    socket.on(SocketChannels.createRoom, (roomId) => {
        const room = hostedRooms[roomId];
        if (room) return io.emit(SocketChannels.error, { status: StatusCodes.CONFLICT, message: "Room Already Exists" });

        hostedRooms[roomId] = {
            hostId: userId,
            members: new Set([userId]),
            bannedUsers: new Set()
        };
        socket.join(roomId);

        // ! if unintended users are also getting the event, use io.to(roomId), 
        io.emit(SocketChannels.roomList, Object.keys(hostedRooms));
    });

    socket.on(SocketChannels.deleteRoom, (roomId) => {
        const room = hostedRooms[roomId];
        if (!room) return io.emit(SocketChannels.error, { status: StatusCodes.NOT_FOUND, message: "Room doest not exists" });
        if (room.hostId != userId) return io.emit(SocketChannels.error, { status: StatusCodes.UNAUTHORIZED, message: "You are not host of this room" });

        io.to(roomId).emit(SocketChannels.roomClosed, {
            roomId,
            message: "Room has been closed by the host",
        });

        for (const member of room.members) {
            if (onlineUsers.has(member)) {
                const memberSocket = io.sockets.sockets.get(onlineUsers.get(member)!);
                memberSocket?.leave(roomId);
            }
        }

        delete hostedRooms[roomId];

        // ! if unintended users are also getting the event, use io.to(roomId), 
        io.emit(SocketChannels.roomList, Object.keys(hostedRooms));
    });

    // user only
    socket.on(SocketChannels.joinRoom, (roomId) => {
        const room = hostedRooms[roomId];
        if (!room) return io.emit(SocketChannels.error, { status: StatusCodes.NOT_FOUND, message: "This room does not exists" });
        if (room.bannedUsers.has(userId)) return io.emit(SocketChannels.error, { status: StatusCodes.UNAUTHORIZED, message: "You are banned from this room" });
        if (room.members.has(userId)) return io.emit(SocketChannels.error, { status: StatusCodes.CONTINUE, message: "You are already inthis room" });
        room.members.add(userId);
        socket.join(roomId);
        io.to(roomId).emit(SocketChannels.userJoined, userId);
    });

    socket.on(SocketChannels.leaveRoom, (roomId) => {
        const room = hostedRooms[roomId];
        if (!room) return io.emit(SocketChannels.error, { status: StatusCodes.NOT_FOUND, message: "This room does not exists" });
        room.members.delete(userId);
        socket.leave(roomId);

        io.to(roomId).emit(SocketChannels.userLeft, userId);
    });

    socket.on(SocketChannels.getRooms, () => {
        io.emit(SocketChannels.roomList, Object.keys(hostedRooms));
    });

    // host only
    socket.on(SocketChannels.banUser, ({ roomId, targetId }) => {

    });

    socket.on(SocketChannels.inviteUser, ({ roomId, targetId }) => { });


}