import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCalendarEventDto {
  @IsString()
  projectId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  dueDate!: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsIn(['none', 'monthly', 'yearly'])
  recurrence?: string;

  @IsOptional()
  @IsIn(['payment', 'service', 'renewal', 'other'])
  category?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  remindDays?: number[];
}

export class UpdateCalendarEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsIn(['none', 'monthly', 'yearly'])
  recurrence?: string;

  @IsOptional()
  @IsIn(['payment', 'service', 'renewal', 'other'])
  category?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  remindDays?: number[];
}

export class UpcomingCalendarQueryDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  days?: number;
}