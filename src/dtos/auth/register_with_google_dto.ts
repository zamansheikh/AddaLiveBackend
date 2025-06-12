import { IsEmail, IsNumber,  IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  name!: string;

  @IsString()
  first_name!: string;

  @IsString()
  last_name!: string;

  @IsString()
  uid!: number;
  
}
