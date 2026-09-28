import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateActivityDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  userRole?: string; // "BUYER", "SELLER", "DEALER", "ANONYMOUS"

  @IsNotEmpty()
  @IsString()
  actionType: string; // "VIEW_PROPERTY", "SEARCH", "FILTER", "SAVE_WISHLIST", "CONTACT_SELLER", "SUBMIT_PROPERTY"

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  details?: string;
}
