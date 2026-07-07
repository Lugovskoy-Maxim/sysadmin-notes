export type PlanId = 'free' | 'pro' | 'team';

export type PlanFeature = 'facility' | 'assignees' | 'members' | 'shareLinks';

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceMonthlyRub: number;
  description: string;
  maxOwnedProjects: number;
  maxMembersPerProject: number;
  facilityModules: boolean;
  taskAssignees: boolean;
  teamCollaboration: boolean;
  shareLinks: boolean;
  highlights: string[];
};

export const PLAN_CATALOG: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Бесплатный',
    priceMonthlyRub: 0,
    description: 'Личное хранилище и задачи для одного администратора',
    maxOwnedProjects: 2,
    maxMembersPerProject: 0,
    facilityModules: false,
    taskAssignees: false,
    teamCollaboration: false,
    shareLinks: true,
    highlights: [
      '2 собственных проекта',
      'Хранилище и задачи',
      'Публичные ссылки на записи',
      'Участие в чужих проектах (если пригласили)',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthlyRub: 490,
    description: 'Расширенные модули и небольшая команда',
    maxOwnedProjects: 10,
    maxMembersPerProject: 5,
    facilityModules: true,
    taskAssignees: true,
    teamCollaboration: true,
    shareLinks: true,
    highlights: [
      '10 проектов',
      'До 5 участников в проекте',
      'Склад, оснащение, карта сети',
      'Исполнители в задачах',
      'Совместное редактирование',
    ],
  },
  team: {
    id: 'team',
    name: 'Team',
    priceMonthlyRub: 1490,
    description: 'Полноценная работа отдела инфраструктуры',
    maxOwnedProjects: 50,
    maxMembersPerProject: 25,
    facilityModules: true,
    taskAssignees: true,
    teamCollaboration: true,
    shareLinks: true,
    highlights: [
      '50 проектов',
      'До 25 участников в проекте',
      'Все модули Pro',
      'Роли viewer / editor',
      'Приоритетная поддержка',
    ],
  },
};

export function isPaidPlan(plan: PlanId) {
  return plan === 'pro' || plan === 'team';
}

export function planHasFeature(plan: PlanId, feature: PlanFeature) {
  const def = PLAN_CATALOG[plan];
  switch (feature) {
    case 'facility':
      return def.facilityModules;
    case 'assignees':
      return def.taskAssignees;
    case 'members':
      return def.teamCollaboration;
    case 'shareLinks':
      return def.shareLinks;
    default:
      return false;
  }
}