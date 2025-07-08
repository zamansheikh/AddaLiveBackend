import { Socket, Server } from 'socket.io';
import { SocketChannels } from '../../Utils/enums';
import { StatusCodes } from 'http-status-codes';
import { RoomData } from '../socket_server';
import AppError from '../../errors/app_errors';
import { IUserDocument } from '../../../models/user/user_model_interface';
import { IUserRepository } from '../../../repository/user_repository';

export interface ISerializedRoomData {
    hostId: string;
    hostDetails?: IUserDocument | null;
    members: string[];
    bannedUsers: string[];
    title: string;
}



export async function registerGroupRoomHandler(io: Server, socket: Socket, onlineUsers: Map<string, string>, hostedRooms: Record<string, RoomData>, userRepository: IUserRepository) {
    const userId = socket.handshake.query.userId as string;
    const userDetails = await userRepository.getUserDetailsSelectedField(userId, ["name", "avatar", "uid", "country"]);
    if (!userId) throw new AppError(StatusCodes.NOT_FOUND, "User not found");


    // host
    socket.on(SocketChannels.createRoom, (roomId, title) => {
        const room = hostedRooms[roomId];
        if (room) return io.emit(SocketChannels.error, { status: StatusCodes.CONFLICT, message: "Room Already Exists" });

        hostedRooms[roomId] = {
            hostId: userId,
            hostDetails: userDetails,
            members: new Set([userId]),
            bannedUsers: new Set(),
            title: title,
        };
        socket.join(roomId);

        // ! if unintended users are also getting the event, use io.to(roomId), 
        io.to(roomId).emit(SocketChannels.roomList, Object.keys(hostedRooms));
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
        console.log(hostedRooms);
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
        const serializedRoom: Record<string, ISerializedRoomData> = {};

        for (const [room, roomData] of Object.entries(hostedRooms)) {
            serializedRoom[room as string] = {
                hostId: roomData.hostId,
                hostDetails: roomData.hostDetails,
                members: Array.from(roomData.members),
                bannedUsers: Array.from(roomData.bannedUsers),
                title: roomData.title,
            };
        }

        io.emit(SocketChannels.roomList, serializedRoom);
    });



    // host only
    socket.on(SocketChannels.banUser, ({ roomId, targetId }) => {

    });

    socket.on(SocketChannels.inviteUser, ({ roomId, targetId }) => { });


}