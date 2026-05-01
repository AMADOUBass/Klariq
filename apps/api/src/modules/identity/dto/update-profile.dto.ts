import { IsOptional, IsString, IsEnum } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['fr-CA', 'en-CA', 'en-US'])
  locale?: string;
}
