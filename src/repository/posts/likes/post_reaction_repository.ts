import { IPostsReaction, IPostsReactionModel } from "../../../entities/posts/posts_reaction_interface";
import { IPostReactionRepository } from "./post_reaction_repository_interface";

export default class PostsReactionRepostitory implements IPostReactionRepository{
    PostReactionModel: IPostsReactionModel;
    
    constructor(PostReactionModel: IPostsReactionModel) {
        this.PostReactionModel = PostReactionModel;
    }

    async create(PostEntity: IPostsReaction) { 
        const reelReaction =  new this.PostReactionModel(PostEntity);
        return await reelReaction.save();
    }

    async findPostReactionById(id: string) { 
        return await this.PostReactionModel.findById(id);
    }

    async findAllPostReactions() {
        return await this.PostReactionModel.find();
     }

    async findPostReactionsConditionally(condition: Record<string, string|number> ) { 
        return await this.PostReactionModel.find(condition);
    }

    async findPostReactopnByIdAndUpdate(id: string, payload: Record<string, any>) { 
        return await this.PostReactionModel.findByIdAndUpdate(id, payload, {new:true});
    }

    async deleteReactionByID(reelId: string) {
        return this.PostReactionModel.findByIdAndDelete(reelId);
    }

} 