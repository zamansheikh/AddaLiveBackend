import { IsString } from "class-validator";

export class EditCommentDto {
    @IsString()
    commentId!:string;

    @IsString()
    newComment!: string;

}