import { IsString } from "class-validator";


export class PostCommentDto {
   
    @IsString()
    postId!: string;

    @IsString()
    commentText!: string;
}