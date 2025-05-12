import { IsEmail, IsNumber,  IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
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

  @IsNumber()
  uid!: number;
  
}
