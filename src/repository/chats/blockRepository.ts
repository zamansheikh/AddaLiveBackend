import { IBlockChat, IBlockChatDocument, IBlockChatModel } from "../../models/chats/block_model";

export interface IBlockChatRepository {
    createBlock(block: IBlockChat): Promise<IBlockChatDocument>;
    deleteBlock(id: string): Promise<IBlockChatDocument>;
    isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
    isMyBlocked(blockerId: string, blockedId: string): Promise<IBlockChatDocument | null>;
}

export class BlockChatRepository implements IBlockChatRepository {
    Model: IBlockChatModel;

    constructor(Model: IBlockChatModel) {
        this.Model = Model;
    }

    async createBlock(block: IBlockChat): Promise<IBlockChatDocument> {
       const newBlock = new this.Model(block);
        return await newBlock.save();
        
    }

    async deleteBlock(id: string): Promise<IBlockChatDocument> {
        const deletedBlock = await this.Model.findByIdAndDelete(id);
        if (!deletedBlock) {
            throw new Error("Block not found");
        }
        return deletedBlock;
    }

    async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
        const block = await this.Model.findOne({$or: [{ blockerId, blockedId }, { blockerId: blockedId, blockedId: blockerId }]});
        return !!block;
    }

    async isMyBlocked(blockerId: string, blockedId: string): Promise<IBlockChatDocument | null> {
        const myBlock = await this.Model.findOne({ blockerId, blockedId });
        return myBlock;
    }
    
}