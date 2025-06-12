import { IsNumber, IsString } from "class-validator";

export class UploadReelDto {
    @IsString()
    video_length!: string
}