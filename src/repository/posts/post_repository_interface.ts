import { IPagination } from "../../core/Utils/query_builder";
import { IPost, IPostDocument } from "../../entities/posts/post_interface";

export interface IPostRepository {
    create(postEnity: IPost): Promise<IPostDocument | null>;
    getAllPosts(query: Record<string, any>): Promise<{pagination: IPagination, data: IPostDocument[]} | null>;
    findPostById(id: string): Promise<IPostDocument | null>;
    findPostsConditionally(condition: Record<string, string | number>): Promise<IPostDocument[] | null>;
    updateCount(postID: string, payload: Record<string, number>): Promise<IPostDocument | string | null>;
    findPostByIdAndUpdate(id: string, payload: Record<string, any>): Promise<IPostDocument | null>;
    deletePostById(reelId: string): Promise<IPostDocument | null>;
}