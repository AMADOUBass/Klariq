import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { AccountType } from '@klariq/db';

export class CreateAccountDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}
