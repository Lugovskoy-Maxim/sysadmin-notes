import { IsIn, IsISO8601, IsOptional } from 'class-validator';

export class UpdateUserAdminDto {
  @IsOptional()
  @IsIn(['user', 'admin'])
  role?: 'user' | 'admin';

  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';

  @IsOptional()
  @IsIn(['free', 'pro', 'team'])
  plan?: 'free' | 'pro' | 'team';

  @IsOptional()
  @IsIn(['active', 'canceled'])
  subscriptionStatus?: 'active' | 'canceled';

  @IsOptional()
  @IsISO8601()
  currentPeriodEnd?: string | null;
}