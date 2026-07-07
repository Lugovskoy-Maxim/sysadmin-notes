import { IsEmail, IsIn, IsString } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsIn(['editor', 'viewer'])
  role: 'editor' | 'viewer' = 'editor';
}

export class UpdateMemberRoleDto {
  @IsIn(['editor', 'viewer'])
  role!: 'editor' | 'viewer';
}