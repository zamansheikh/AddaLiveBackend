import { IsString } from "class-validator";
import { ReactionType } from "../../core/Utils/enums";


export class ReelReactionDto {
    @IsString()
    reelId!: string;

    @IsString()
    reaction_type!: ReactionType;
}