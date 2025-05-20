import { IsString } from "class-validator";
import { ReactionType } from "../../core/Utils/enums";



export  class ReactOnCommentDto {
    @IsString()
    commentId!:string;

    @IsString()
    reaction_type!: ReactionType;
}