import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isPaidPlan, PLAN_CATALOG, PlanFeature, PlanId, planHasFeature } from './plans';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateSubscription(userId: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.subscription.create({
      data: { userId, plan: 'free', status: 'active' },
    });
  }

  async resolvePlan(userId: string): Promise<PlanId> {
    const sub = await this.getOrCreateSubscription(userId);
    if (sub.status !== 'active') return 'free';
    if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return 'free';
    return sub.plan as PlanId;
  }

  async getUsage(userId: string) {
    const ownedProjects = await this.prisma.project.count({ where: { userId } });
    const sharedProjects = await this.prisma.projectMember.count({ where: { userId } });
    const maxMembers = await this.prisma.projectMember.groupBy({
      by: ['projectId'],
      where: { project: { userId } },
      _count: { _all: true },
    });
    const busiestProjectMembers = maxMembers.reduce((max, row) => Math.max(max, row._count._all), 0);
    return {
      ownedProjects,
      sharedProjects,
      busiestProjectMembers,
    };
  }

  async getStatus(userId: string) {
    const subscription = await this.getOrCreateSubscription(userId);
    const plan = await this.resolvePlan(userId);
    const usage = await this.getUsage(userId);
    const limits = PLAN_CATALOG[plan];
    return {
      plan,
      planName: limits.name,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      limits: {
        maxOwnedProjects: limits.maxOwnedProjects,
        maxMembersPerProject: limits.maxMembersPerProject,
        facilityModules: limits.facilityModules,
        taskAssignees: limits.taskAssignees,
        teamCollaboration: limits.teamCollaboration,
        shareLinks: limits.shareLinks,
      },
      usage,
      isPremium: isPaidPlan(plan),
    };
  }

  listPlans() {
    return Object.values(PLAN_CATALOG).map((plan) => ({
      id: plan.id,
      name: plan.name,
      priceMonthlyRub: plan.priceMonthlyRub,
      description: plan.description,
      highlights: plan.highlights,
      limits: {
        maxOwnedProjects: plan.maxOwnedProjects,
        maxMembersPerProject: plan.maxMembersPerProject,
        facilityModules: plan.facilityModules,
        taskAssignees: plan.taskAssignees,
        teamCollaboration: plan.teamCollaboration,
      },
    }));
  }

  async subscribe(userId: string, plan: 'pro' | 'team') {
    const current = await this.getOrCreateSubscription(userId);
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    const updated = await this.prisma.subscription.update({
      where: { id: current.id },
      data: {
        plan,
        status: 'active',
        currentPeriodEnd: periodEnd,
      },
    });
    return this.getStatus(userId);
  }

  async cancel(userId: string) {
    await this.getOrCreateSubscription(userId);
    await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'canceled', plan: 'free', currentPeriodEnd: null },
    });
    return this.getStatus(userId);
  }

  async setSubscriptionForUser(
    userId: string,
    data: { plan: PlanId; status?: 'active' | 'canceled'; currentPeriodEnd?: string | null },
  ) {
    await this.getOrCreateSubscription(userId);
    const periodEnd =
      data.currentPeriodEnd === null
        ? null
        : data.currentPeriodEnd
          ? new Date(data.currentPeriodEnd)
          : data.plan === 'free'
            ? null
            : (() => {
                const end = new Date();
                end.setDate(end.getDate() + 30);
                return end;
              })();

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: data.plan,
        status: data.status ?? 'active',
        currentPeriodEnd: periodEnd,
      },
    });
    return this.getStatus(userId);
  }

  async assertCanCreateProject(userId: string) {
    const plan = await this.resolvePlan(userId);
    const limit = PLAN_CATALOG[plan].maxOwnedProjects;
    const owned = await this.prisma.project.count({ where: { userId } });
    if (owned >= limit) {
      throw new ForbiddenException(
        `Лимит тарифа «${PLAN_CATALOG[plan].name}»: не более ${limit} собственных проектов. Оформите Pro или Team.`,
      );
    }
  }

  async assertCanInviteMember(ownerId: string, projectId: string) {
    const plan = await this.resolvePlan(ownerId);
    if (!planHasFeature(plan, 'members')) {
      throw new ForbiddenException('Приглашение участников доступно на тарифах Pro и Team.');
    }
    const limit = PLAN_CATALOG[plan].maxMembersPerProject;
    const count = await this.prisma.projectMember.count({ where: { projectId } });
    if (count >= limit) {
      throw new ForbiddenException(`Лимит тарифа: не более ${limit} участников в проекте.`);
    }
  }

  async getProjectOwnerPlan(projectId: string): Promise<PlanId> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project) return 'free';
    return this.resolvePlan(project.userId);
  }

  async assertProjectFeature(projectId: string, feature: PlanFeature) {
    const plan = await this.getProjectOwnerPlan(projectId);
    if (!planHasFeature(plan, feature)) {
      const message =
        feature === 'facility'
          ? 'Модули склада, оснащения и сети доступны на тарифах Pro и Team.'
          : feature === 'assignees'
            ? 'Назначение исполнителей доступно на тарифах Pro и Team.'
            : 'Функция доступна на тарифах Pro и Team.';
      throw new ForbiddenException(message);
    }
  }

  projectCapabilities(ownerPlan: PlanId, role: 'owner' | 'editor' | 'viewer') {
    const paid = isPaidPlan(ownerPlan);
    return {
      facility: planHasFeature(ownerPlan, 'facility'),
      assignees: planHasFeature(ownerPlan, 'assignees'),
      canManageMembers: role === 'owner' && planHasFeature(ownerPlan, 'members'),
      canEdit: role === 'owner' || role === 'editor',
      isPremiumProject: paid,
    };
  }
}