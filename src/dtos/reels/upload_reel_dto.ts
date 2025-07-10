import { IsNumber, IsString } from "class-validator";

export class UploadReelDto {
    @IsString()
    videoLength!: string
}