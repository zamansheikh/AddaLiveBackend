import { IReelsComment } from "../models/reels/comments/reels_comment_interface"
import { IReelsReaction } from "../models/reels/likes/reels_reaction_interface"

export interface IReelCommentEntity {
    commentedBy: string,
    CommentedTo: string,
    article: string,
    reactions: IReelsReaction[];
    comments: IReelsComment[];
}