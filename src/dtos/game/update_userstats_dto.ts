import { IsNumber } from "class-validator";

export class UpdateUserStatsDto {
    @IsNumber()
    total_gold!: number;
    @IsNumber()
    total_diamond!: number
}