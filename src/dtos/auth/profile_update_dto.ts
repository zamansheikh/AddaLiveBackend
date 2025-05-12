import { IsString, IsOptional } from 'class-validator';

export class ProfileUpdateDto {
    @IsOptional() @IsString() firstName?: string;
    @IsOptional() @IsString() lastName?: string;
    @IsOptional() @IsString() bio?: string;
    @IsOptional() @IsString() gender?: string;
    @IsOptional() @IsString() country?: string;
    @IsOptional() @IsString() date?: string;
}
