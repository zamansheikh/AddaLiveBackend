import { IsNumber, IsOptional, IsString } from "class-validator";

export class GiftUserDto {
    @IsString()
    userId!: string;

    @IsNumber()
    coins!: number;

    @IsOptional()
    @IsNumber()
    diamonds!: number;

}