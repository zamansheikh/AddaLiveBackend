import { IsString } from "class-validator";

export class PostReactionDto {
    @IsString()
    postId!: string;

    @IsString()
    reaction_type!: string;
}