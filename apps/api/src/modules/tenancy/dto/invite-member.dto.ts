import { IsEmail, IsString, IsEnum } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsEnum(['ADMIN', 'MEMBER', 'VIEWER'])
  role!: string;
}
