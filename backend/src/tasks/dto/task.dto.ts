import { IsArray, IsIn, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['todo', 'in_progress', 'done'])
  status?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;

  @IsOptional()
  @IsString()
  assigneeId?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['todo', 'in_progress', 'done'])
  status?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: string;

  @IsOptional()
  @IsString()
  dueDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;
}

export class ReorderTaskItemDto {
  @IsString()
  id!: string;

  @IsIn(['todo', 'in_progress', 'done'])
  status!: string;

  @IsInt()
  sortOrder!: number;
}

export class ReorderTasksDto {
  @IsString()
  projectId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderTaskItemDto)
  items!: ReorderTaskItemDto[];
}