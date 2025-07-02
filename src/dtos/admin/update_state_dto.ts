import { Expose } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

export class UpdateStatDto {
    @IsOptional()
    @IsNumber()
    @Expose()
    diamonds!: number;

    @IsOptional()
    @IsNumber()
    @Expose()
    stars!: number;
}