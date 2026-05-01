import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Query, 
  UseInterceptors, 
  UploadedFile,
  BadRequestException
, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BankService } from './bank.service';
import { ActiveTenant } from '../../common/decorators/active-tenant.decorator';
import type { TenantContext } from '../../common/context/tenant.context';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Bank')
@Controller('bank')
@UseGuards(AuthGuard)
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Get('statements')
  @ApiOperation({ summary: 'List all bank statements' })
  async getStatements(@ActiveTenant() tenant: TenantContext) {
    return this.bankService.getStatements(tenant.companyId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List bank transactions' })
  async getTransactions(
    @ActiveTenant() tenant: TenantContext,
    @Query('statementId') statementId?: string,
  ) {
    return this.bankService.getTransactions(tenant.companyId, statementId);
  }

  @Post('import/:accountId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import bank transactions from CSV' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async importStatement(
    @ActiveTenant() tenant: TenantContext,
    @Param('accountId') accountId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.bankService.importStatement(
      tenant.companyId,
      accountId,
      file.buffer,
      file.originalname,
    );
  }
}
