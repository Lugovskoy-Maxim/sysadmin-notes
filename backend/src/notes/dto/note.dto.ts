import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  host?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  port?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  login?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  totpSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  sshKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  memo?: string;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  content?: string;
}

export class MoveNoteDto {
  @IsString()
  projectId: string;
}

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  host?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  port?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  login?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  totpSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  sshKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  memo?: string;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  favorite?: boolean;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}