import { DatabaseNames } from "../../../core/Utils/enums";

export const messagesUserLookUp = (localfied: string, as: string) => {
    return {
        $lookup: {
            from: DatabaseNames.User,
            localField: localfied,
            foreignField: "_id",
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