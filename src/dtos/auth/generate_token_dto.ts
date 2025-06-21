import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class GenerateTokenDto {
    @IsString()
    @IsNotEmpty()
    channelName!: string

    @IsString()
    @IsNotEmpty()
    uid!: string;

    @IsOptional()
    @IsString()
    APP_ID!: string;

    @IsOptional()
    @IsString()
    APP_CERTIFICATE!: string;


}