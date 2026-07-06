import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class StartTimerDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  memo?: string;
}

export class UpdateTimeEntryDto {
  @IsOptional()
  @IsString()
  memo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsString()
  startedAt?: string;

  @IsOptional()
  @IsString()
  endedAt?: string;
}

export class CreateTimeEntryDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsString()
  startedAt: string;

  @IsString()
  endedAt: string;

  @IsOptional()
  @IsString()
  memo?: string;
}