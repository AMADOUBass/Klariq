import { IsString, IsOptional, IsDateString } from 'class-validator';

export class OnboardCompanyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  taxNumberGst?: string;

  @IsOptional()
  @IsString()
  taxNumberQst?: string;

  @IsDateString()
  fiscalYearStart!: string;

  @IsString()
  baseCurrency!: string;
}
