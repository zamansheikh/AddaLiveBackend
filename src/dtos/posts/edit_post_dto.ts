import { IsOptional, IsString } from "class-validator";

export class EditPostDto {
    @IsString()
    postId!: string;

    @IsString()
    postCaption!: string;
}