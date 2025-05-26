import { Types } from "mongoose";
import { DatabaseNames } from "../../../core/Utils/enums";
import { QueryBuilder } from "../../../core/Utils/query_builder";
import { IPostComment, IPostCommentDocument, IPostCommentModel } from "../../../entities/posts/posts_comments_interface";
import { IPostCommentRepository } from "./post_commnet_repository_interface";



export default class PostsCommentRepostitory implements IPostCommentRepository {
    PostCommentModel: IPostCommentModel;
    constructor(PostCommentModel: IPostCommentModel) {
        this.PostCommentModel = PostCommentModel;
    }

    async create(PostEntity: IPostComment) {
        const reel = new this.PostCommentModel(PostEntity);
        return await reel.save();
    }

    async findCommentById(commentId: string): Promise<IPostCommentDocument | null> {
        return await this.PostCommentModel.findById(commentId);
    }

    async deleteCommentByID(commentId: string): Promise<IPostCommentDocument | null> {
        return await this.PostCommentModel.findByIdAndDelete(commentId);
    }

    async findCommentByIdAndUpdate(commentId: string, payload: Record<string, string>): Promise<IPostCommentDocument | null> {
        return await this.PostCommentModel.findByIdAndUpdate(commentId, payload, { new: true });
    }
    async getAllComments(): Promise<IPostCommentDocument[] | null> {
        return await this.PostCommentModel.find();
    }
    async updateCount(comentId: string, payload: Record<string, number>): Promise<IPostCommentDocument | null> {
        return await this.PostCommentModel.findByIdAndUpdate(comentId, { $inc: payload }, { new: true });
    }

    async getCommentsWithReplies({ postId, query }: { postId: string, query: Record<string, any> }) {
        const qb = new QueryBuilder<IPostCommentDocument>(this.PostCommentModel, query);

        const result = qb
            .aggregate(
                [
                    { $match: { commentedTo: new Types.ObjectId(postId), parentComment: null } },
                    { $lookup: { from: DatabaseNames.PostComments, localField: "_id", foreignField: "parentComment", as: "replies" } }
                ]
            )
            .paginate()
        const pagination = await result.countTotal();
        const data = await result.exec();

        return {
            pagination,
            data
        }
    }

} 