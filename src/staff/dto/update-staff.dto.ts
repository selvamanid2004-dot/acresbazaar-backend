import { IsString, IsOptional, IsArray, IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  role?: 'ADMIN' | 'STAFF' | 'SUPER_ADMIN' | string;

  @IsOptional()
  @IsArray()
  permissions?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetStaffPasswordDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}
