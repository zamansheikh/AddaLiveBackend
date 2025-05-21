import { Document, Model, Types } from "mongoose"


export interface IPostComment {
    commentedBy: Types.ObjectId,
    commentedTo: Types.ObjectId,
    article: string,
    parentComment?: string,
    reactionsCount?: number,
}

export interface IPostCommentDocument extends IPostComment, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IPostCommentModel extends Model<IPostCommentDocument> { }