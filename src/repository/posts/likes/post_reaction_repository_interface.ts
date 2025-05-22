import { IPost } from "../../../entities/posts/post_interface";
import { IPostsReaction, IPostsReactionDocument } from "../../../entities/posts/posts_reaction_interface";

export interface IPostReactionRepository {
    create(PostEntity: IPostsReaction): Promise<IPostsReactionDocument | null>;
    findPostReactionById(id: string): Promise<IPostsReactionDocument | null>;
    findAllPostReactions(): Promise<IPostsReactionDocument[] | null>;
    findPostReactionsConditionally(condition: Record<string, string | number> ): Promise<IPostsReactionDocument[] | null>;
    findPostReactopnByIdAndUpdate(id: string, payload: Record<string, any>) : Promise<IPostsReactionDocument | null>;
    deleteReactionByID(reelId: string): Promise<IPostsReactionDocument | null>;
}