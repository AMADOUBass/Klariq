import { IsString, IsArray, IsDateString, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceLineDto {
  @IsString()
  description!: string;

  @IsString()
  quantity!: string;

  @IsString()
  unitPrice!: string;

  @IsOptional()
  @IsString()
  taxRateId?: string;
}

export class CreateInvoiceDto {
  @IsString()
  contactId!: string;

  @IsString()
  number!: string;

  @IsDateString()
  date!: string;

  @IsDateString()
  dueDate!: string;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines!: CreateInvoiceLineDto[];
}
