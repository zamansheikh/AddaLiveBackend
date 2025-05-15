import { IsNumber, IsString } from "class-validator";

export class UploadReelDto {
    @IsString()
    ownerId!: string;

    @IsString()
    video_length!: string
}