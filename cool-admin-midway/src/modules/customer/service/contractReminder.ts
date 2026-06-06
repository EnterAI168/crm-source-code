import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { BaseService } from '@cool-midway/core';
import { Repository } from 'typeorm';
import * as moment from 'moment';
import { CrmContractReminderEntity } from '../entity/contractReminder';
import { TaskInfoEntity } from '../../task/entity/info';
import { TaskInfoService } from '../../task/service/info';

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CrmContractReminderService extends BaseService {
  @InjectEntityModel(CrmContractReminderEntity)
  crmContractReminderEntity: Repository<CrmContractReminderEntity>;

  @InjectEntityModel(TaskInfoEntity)
  taskInfoEntity: Repository<TaskInfoEntity>;

  @Inject()
  ctx: Context;

  @Inject()
  taskInfoService: TaskInfoService;

  async ensureDailyReminderTask() {
    const jobId = 'crm-contract-reminder-daily';
    const payload: Partial<TaskInfoEntity> = {
      jobId,
      repeatConf: null,
      name: '合約回傳每日提醒',
      cron: '0 0 10 * * *',
      limit: null,
      every: null,
      remark: '每天10:00提醒業務人員儘快回傳已審核通過報價單合約',
      status: 1,
      startDate: null,
      endDate: null,
      data: null,
      service: 'CrmContractReminderService.generateDailyReminders()',
      type: 0,
      nextRunTime: null,
      taskType: 0,
      lastExecuteTime: null,
      lockExpireTime: null,
    };
    let task = await this.taskInfoEntity.findOneBy({ jobId });

    if (!task) {
      task = await this.taskInfoEntity.save(payload);
    } else {
      await this.taskInfoEntity.update({ id: task.id }, payload);
      task = {
        ...task,
        ...payload,
      } as TaskInfoEntity;
    }

    await this.taskInfoService.addOrUpdate(task);
    return task;
  }

  async generateDailyReminders(date = moment().format('YYYY-MM-DD')) {
    const groups = await this.fetchPendingContractGroups();
    let inserted = 0;
    let updated = 0;

    for (const group of groups) {
      const userId = Number(group.userId || 0);
      if (!userId) {
        continue;
      }

      const quotes = group.quotes || [];
      const quoteCount = quotes.length;
      if (quoteCount === 0) {
        continue;
      }

      const content = `您有 ${quoteCount} 個報價單已審核通過，請儘快在14天內回傳合約，否則每個逾期報價單扣除500獎金。`;
      const exists = await this.crmContractReminderEntity.findOneBy({
        userId,
        notifyDate: date,
        isDeleted: 0,
      });

      if (exists) {
        await this.crmContractReminderEntity.update(
          { id: exists.id },
          {
            userName: group.userName || null,
            quoteCount,
            content,
            detailJson: quotes,
          }
        );
        updated++;
        continue;
      }

      await this.crmContractReminderEntity.save({
        userId,
        userName: group.userName || null,
        notifyDate: date,
        quoteCount,
        content,
        detailJson: quotes,
        isRead: 0,
        isDeleted: 0,
      });
      inserted++;
    }

    return {
      notifyDate: date,
      inserted,
      updated,
      userCount: groups.length,
    };
  }

  async unreadCount() {
    const userId = this.currentUserId();
    const rows = await this.nativeQuery(
      `
      SELECT COALESCE(SUM(quoteCount), 0) AS count
      FROM crm_contract_reminder
      WHERE userId = ?
        AND isRead = 0
        AND isDeleted = 0
      `,
      [userId]
    );
    return { count: Number(rows?.[0]?.count || 0) };
  }

  async page(query: any) {
    const userId = this.currentUserId();
    const currentPage = Math.max(1, Number(query?.page || 1));
    const pageSize = Math.max(1, Number(query?.size || 10));
    const offset = (currentPage - 1) * pageSize;
    const countRows = await this.nativeQuery(
      `
      SELECT COUNT(1) AS count
      FROM crm_contract_reminder
      WHERE userId = ?
        AND isDeleted = 0
      `,
      [userId]
    );
    const list = await this.nativeQuery(
      `
      SELECT *
      FROM crm_contract_reminder
      WHERE userId = ?
        AND isDeleted = 0
      ORDER BY notifyDate DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [userId, pageSize, offset]
    );
    return {
      list,
      pagination: {
        page: currentPage,
        size: pageSize,
        total: Number(countRows?.[0]?.count || 0),
      },
    };
  }

  async markRead(param: any) {
    const userId = this.currentUserId();
    const ids = Array.isArray(param?.ids)
      ? param.ids.map(id => Number(id)).filter(id => id > 0)
      : [];
    const now = this.now();

    if (ids.length > 0) {
      await this.nativeQuery(
        `
        UPDATE crm_contract_reminder
        SET isRead = 1, readTime = ?, updateTime = ?
        WHERE userId = ?
          AND isDeleted = 0
          AND id in (?)
        `,
        [now, now, userId, ids]
      );
    } else {
      await this.crmContractReminderEntity.update(
        { userId, isDeleted: 0 },
        { isRead: 1, readTime: now }
      );
    }

    return await this.unreadCount();
  }

  async overdueDeductionRows(
    userId: number,
    range: { start: string; end: string }
  ) {
    const rows = await this.nativeQuery(
      `
      SELECT
        q.id AS quoteOrderId,
        q.quoteNo,
        q.quoteName,
        q.quoteType,
        q.salesmanId,
        q.contractStatus,
        q.contractUploadTime,
        audit.lastApproveTime,
        DATE_ADD(audit.lastApproveTime, INTERVAL 14 DAY) AS deadlineTime
      FROM crm_quote_order q
      INNER JOIN (
        SELECT
          quoteOrderId,
          COUNT(1) AS auditCount,
          SUM(CASE WHEN auditStatus = 2 THEN 1 ELSE 0 END) AS approvedCount,
          MAX(auditTime) AS lastApproveTime
        FROM crm_quote_order_department_audit
        WHERE isDeleted = 0
        GROUP BY quoteOrderId
      ) audit ON audit.quoteOrderId = q.id
      WHERE q.isDeleted = 0
        AND q.salesmanId = ?
        AND audit.auditCount >= 1
        AND audit.auditCount = audit.approvedCount
        AND audit.lastApproveTime IS NOT NULL
        AND DATE_ADD(audit.lastApproveTime, INTERVAL 14 DAY) >= ?
        AND DATE_ADD(audit.lastApproveTime, INTERVAL 14 DAY) <= ?
        AND DATE_ADD(audit.lastApproveTime, INTERVAL 14 DAY) <= NOW()
        AND (
          q.contractUploadTime IS NULL
          OR q.contractUploadTime = ''
          OR q.contractUploadTime > DATE_ADD(audit.lastApproveTime, INTERVAL 14 DAY)
        )
      ORDER BY deadlineTime ASC, q.id ASC
      `,
      [userId, range.start, range.end]
    );

    return rows.map(row => ({
      ...row,
      stageId: `contract-overdue-${row.quoteOrderId}`,
      stageNo: 0,
      stageName: '合約逾期回傳扣款',
      ratio: 0,
      amount: 0,
      sourceAmount: 0,
      bonusBaseAmount: 0,
      invoiceDate: row.deadlineTime,
      receiptTime: row.deadlineTime,
      receiptAmount: 0,
      receiptVoucher: '',
      mainProductRatio: 0,
      secondaryProductRatio: 0,
      grossProfitAmount: 0,
      mainPerformance: 0,
      secondaryPerformance: 0,
      secondaryGrossProfit: 0,
      isOneTimePayment: 0,
      isContractOverdueDeduction: 1,
      auditApprovedTime: row.lastApproveTime,
      contractDeadlineTime: row.deadlineTime,
      bonusAmount: -500,
    }));
  }

  private async fetchPendingContractGroups() {
    const rows = await this.nativeQuery(
      `
      SELECT
        q.id AS quoteOrderId,
        q.quoteNo,
        q.quoteName,
        q.salesmanId AS userId,
        u.name AS userName,
        audit.lastApproveTime,
        DATE_ADD(audit.lastApproveTime, INTERVAL 14 DAY) AS deadlineTime,
        DATEDIFF(DATE_ADD(audit.lastApproveTime, INTERVAL 14 DAY), NOW()) AS leftDays
      FROM crm_quote_order q
      INNER JOIN base_sys_user u ON u.id = q.salesmanId
      INNER JOIN (
        SELECT
          quoteOrderId,
          COUNT(1) AS auditCount,
          SUM(CASE WHEN auditStatus = 2 THEN 1 ELSE 0 END) AS approvedCount,
          MAX(auditTime) AS lastApproveTime
        FROM crm_quote_order_department_audit
        WHERE isDeleted = 0
        GROUP BY quoteOrderId
      ) audit ON audit.quoteOrderId = q.id
      WHERE q.isDeleted = 0
        AND q.salesmanId IS NOT NULL
        AND audit.auditCount >= 1
        AND audit.auditCount = audit.approvedCount
        AND audit.lastApproveTime IS NOT NULL
        AND (q.contractFile IS NULL OR q.contractFile = '')
      ORDER BY q.salesmanId ASC, deadlineTime ASC, q.id ASC
      `
    );
    const map = new Map<number, any>();
    rows.forEach(row => {
      const userId = Number(row.userId || 0);
      const old = map.get(userId) || {
        userId,
        userName: row.userName,
        quotes: [],
      };
      old.quotes.push({
        quoteOrderId: row.quoteOrderId,
        quoteNo: row.quoteNo,
        quoteName: row.quoteName,
        auditApprovedTime: row.lastApproveTime,
        contractDeadlineTime: row.deadlineTime,
        leftDays: Number(row.leftDays || 0),
        status: Number(row.leftDays || 0) < 0 ? '已逾期' : '待回傳',
      });
      map.set(userId, old);
    });
    return Array.from(map.values());
  }

  private currentUserId() {
    return Number(this.ctx?.admin?.userId || 0);
  }

  private now() {
    return moment().format('YYYY-MM-DD HH:mm:ss');
  }
}
