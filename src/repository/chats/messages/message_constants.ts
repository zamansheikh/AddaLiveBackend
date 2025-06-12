import { DatabaseNames } from "../../../core/Utils/enums";

export const messagesUserLookUp = (localfied: string, as: string) => {
    return {
        $lookup: {
            from: DatabaseNames.User,
            let: { senderId: "$senderId" },
            pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$senderId"] } } },
                { $project: { email: 1, name: 1, avatar: 1 /* other fields you want */ } }
            ],
            as: as,
        }
    };
}

export const messsageUnwind = (path: string) => {
    return {
        $unwind: {
            path: "$" + path,
            preserveNullAndEmptyArrays: true
        }
    };
}