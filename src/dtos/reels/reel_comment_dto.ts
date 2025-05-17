import { IsString } from "class-validator";

export class ReelCommentDto {
    @IsString()
    reelId!: string;

    @IsString()
    comment!: string;

}