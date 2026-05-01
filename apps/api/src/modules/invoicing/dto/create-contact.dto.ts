import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ContactType } from '@klariq/db';

export class CreateContactDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEnum(ContactType)
  type!: ContactType;
}
