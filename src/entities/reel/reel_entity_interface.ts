import { ReelStatus } from "../../core/Utils/enums";
import { IReelsComment } from "../../models/reels/comments/reels_comment_interface";
import { IReelsReaction } from "../../models/reels/likes/reels_reaction_interface";


export interface  IReelEntity {
    
    owenerId: string;
    status?: ReelStatus.active | ReelStatus.inactive; 
    videoLength: number;
    videoMaximumLength?: number;
    reelUrl: string;
    reactions?: IReelsReaction[];
    comments?: IReelsComment[];
    topRank?: number;

}