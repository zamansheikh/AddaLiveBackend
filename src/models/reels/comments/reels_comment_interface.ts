import { Document, Model, Types } from "mongoose"


export interface IReelsComment {
    commentedBy: Types.ObjectId,
    CommentedTo: Types.ObjectId,
    article: string,
    parentComment?: string,
   reactionsCount?: number,
}

export interface IReelsCommentDocument extends IReelsComment, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IReelsCommentModel extends Model<IReelsCommentDocument> {}