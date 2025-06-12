import { IsNumber, IsOptional, IsString } from "class-validator";

export class GiftUserDto {
    @IsString()
    userId!: string;

    @IsString()
    giftType!: string;

    @IsOptional()
    @IsNumber()
    diamonds!: number;

}