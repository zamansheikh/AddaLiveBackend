import { IsNumber, IsOptional, isString, IsString } from "class-validator";

export class GiftUserDto {
    @IsString()
    userId!: string;

    @IsNumber()
    coins!: number;

    @IsOptional()
    @IsNumber()
    diamonds!: number;

    @IsString()
    roomId!: string;

    @IsString()
    giftId!:string
}