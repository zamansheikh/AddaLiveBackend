import { Document, Model } from "mongoose"


export interface IComment {
    commentedBy: string,
    CommentedTo: string,
    article: string,
    comments: IComment[],
}

export interface ICommentDocument extends IComment, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface ICommentModel extends Model<ICommentDocument> {}