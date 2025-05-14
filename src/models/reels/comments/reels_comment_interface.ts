import { Document, Model } from "mongoose"


export interface IReelsComment {
    commentedBy: string,
    CommentedTo: string,
    article: string,
    comments: IReelsComment[],
}

export interface IReelsCommentDocument extends IReelsComment, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IReelsCommentModel extends Model<IReelsCommentDocument> {}