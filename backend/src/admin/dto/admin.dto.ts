import { IsIn, IsOptional } from 'class-validator';

export class UpdateUserAdminDto {
  @IsOptional()
  @IsIn(['user', 'admin'])
  role?: 'user' | 'admin';

  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';
}