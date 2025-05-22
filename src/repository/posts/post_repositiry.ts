import { QueryBuilder } from "../../core/Utils/query_builder";
import { IPost, IPostDocument, IPostModel } from "../../entities/posts/post_interface";
import { IPostRepository } from "./post_repository_interface";


export default class PostRepository implements IPostRepository {
    PostModel: IPostModel;

    constructor(PostModel: IPostModel) {
        this.PostModel = PostModel;
    }

     async create(ReelEntity: IPost) {
            const reel = new this.PostModel(ReelEntity);
            return await reel.save();
        }
        async getAllPosts(query: Record<string, any>) {
            const qb = new QueryBuilder(this.PostModel, query);
            const result = qb.sort().paginate();
            const pagination = await result.countTotal();
            const data = await result.exec();
    
            return {
                pagination,
                data
            }
        }
    
        async findPostById(id: string) {
            return await this.PostModel.findById(id);
        }
    
        async findAllPosts() {
            return await this.PostModel.find();
        }
    
        async findPostsConditionally(condition: Record<string, string | number>) {
            return await this.PostModel.find(condition);
        }
    
        async updateCount(postID: string, payload: Record<string, number>) {
            return this.PostModel.findByIdAndUpdate(postID, { $inc:payload }, { new: true });
        }
    
        async deletePostById(reelId: string): Promise<IPostDocument | null> {
            return await this.PostModel.findByIdAndDelete(reelId);
        }
    
    
        async findPostByIdAndUpdate(id: string, payload: Record<string, any>) {
            return await this.PostModel.findByIdAndUpdate(id, payload, { new: true });
        }
    
}