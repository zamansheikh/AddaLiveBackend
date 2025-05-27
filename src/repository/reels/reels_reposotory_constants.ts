export const reelStructure = {
    $project: {
        reelCaption: 1,
        reelUrl: 1,
        createdAt: 1,
        reactions: 1,
        comments: 1,
        video_length: 1,
        video_maximum_length: 1,
        status: 1,
        topRank: 1,
        latestReactions: 1,
        myReaction: {
            reaction_type: 1
        },
        userInfo: {
            _id: 1,
            name: 1,
            avatar: 1
        }
    }
};

export const reelReactionStructure = {
    reactedBy: 1,
    reactedTo: 1,
    reaction_type: 1,
    createdAt: 1,
    userInfo: {
        _id: 1,
        name: 1,
        avatar: 1 // or whatever other fields you want
    }
}