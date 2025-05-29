import { DatabaseNames } from "../../core/Utils/enums";

export const requestListStructure = {
    $project: {
        sender: 1,
        reciever: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        senderInfo: {
            _id: 1,
            name: 1,
            avatar: 1
        },
        recieverInfo: {
            _id: 1,
            name: 1,
            avatar: 1
        }
    }
}

export const friendShipUserLookUp = (localfied: string, as: string) => {
    return {
        $lookup: {
            from: DatabaseNames.User,
            localField: localfied,
            foreignField: "_id",
            as: as,
        }
    };
}

export const friendUnwind = (path: string) => {
    return {
        $unwind: {
            path: "$" + path,
            preserveNullAndEmptyArrays: true
        }
    };
}