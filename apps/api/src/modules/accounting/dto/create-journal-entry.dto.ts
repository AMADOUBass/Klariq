import { IsString, IsArray, IsDateString, IsEnum, ValidateNested, IsDecimal, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { JournalEntryType, EntryLineType } from '@klariq/db';

export class JournalLineDto {
  @IsString()
  accountId!: string;

  @IsEnum(EntryLineType)
  type!: EntryLineType;

  @IsString()
  amount!: string; // Using string for Decimal precision

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateJournalEntryDto {
  @IsDateString()
  date!: string;

  @IsEnum(JournalEntryType)
  type!: JournalEntryType;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}
