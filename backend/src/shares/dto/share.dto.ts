import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const SHARE_MODES = ['masked', 'full', 'passwords'] as const;
export type ShareMode = (typeof SHARE_MODES)[number];

export class CreateShareDto {
  @IsOptional()
  @IsString()
  noteId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  viewOnly?: boolean;

  @IsOptional()
  @IsIn(SHARE_MODES)
  shareMode?: ShareMode;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  sharePassword?: string;
}

export class AccessShareDto {
  @IsOptional()
  @IsString()
  password?: string;
}