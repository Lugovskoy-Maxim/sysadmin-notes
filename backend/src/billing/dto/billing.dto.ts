import { IsIn } from 'class-validator';

export class SubscribeDto {
  @IsIn(['pro', 'team'])
  plan!: 'pro' | 'team';
}