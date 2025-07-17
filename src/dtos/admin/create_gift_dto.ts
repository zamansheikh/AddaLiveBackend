import { IsNumber, IsString } from "class-validator";

export class CreateGiftDto {
    @IsString()
    giftName!: string;

    @IsString()
    category!: string;

    @IsString()
    diamonds!: number;

    @IsString()
    coinPrice!: number;
}