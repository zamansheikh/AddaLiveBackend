import { IsNumber, IsString } from "class-validator";

export class CreateGiftDto {
    @IsString()
    name!: string;

    @IsString()
    diamonds!: number;

    @IsString()
    coinPrice!: number;
}