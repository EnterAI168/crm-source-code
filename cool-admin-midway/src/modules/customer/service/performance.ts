import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { Between, In, Repository } from 'typeorm';
import * as moment from 'moment';
import { CrmPerformanceEntity } from '../entity/performance';
import { CrmBonusConfigEntity } from '../entity/bonusConfig';
import { CrmQuoteOrderEntity } from '../entity/quoteOrder';
import { CrmQuoteOrderItemEntity } from '../entity/quoteItem';
import { CrmQuoteOrderStageEntity } from '../entity/quoteStage';
import { BaseSysUserEntity } from '../../base/entity/sys/user';
import { BaseSysRoleEntity } from '../../base/entity/sys/role';
import { BaseSysDepartmentEntity } from '../../base/entity/sys/department';
import { BaseSysPermsService } from '../../base/service/sys/perms';
import { BaseSysParamService } from '../../base/service/sys/param';
import { SALESMAN_ROLE_LABEL } from './info';
import { CrmContractReminderService } from './contractReminder';

type DetailType = 'expected' | 'actual';
type InternalDepartmentType = 'koubei' | 'integration' | 'other';

interface EligibleUser {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  departmentId?: number;
  level?: string;
  salary?: number;
  withholdingSalary?: number;
  remark?: string;
  roleType: 'sales' | 'internal';
}

interface BonusContext {
  config: Map<string, number>;
  mainMarginThreshold: number;
  salesMainRate: number;
  salesSecondaryRate: number;
  oneTimeRate: number;
  dutyRate: number;
  mainMonthThreshold: number;
  tierAddThreshold: number;
  tierAddRate: number;
  tierBonusList: { threshold: number; amount: number }[];
}

interface PerformanceScope {
  userId: number;
  isBoss: boolean;
}

interface StatisticsScope {
  userId: number;
  departmentIds: number[];
  departmentUserIds: number[];
  isBoss: boolean;
  isOfficeClerkManager: boolean;
  isOfficeClerk: boolean;
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CrmPerformanceService extends BaseService {
  private readonly SUPER_ROLE_LABELS = ['admin', 'boss'];

  private readonly FINANCE_ROLE_LABELS = ['finance', 'financial', 'accountant'];

  private readonly FINANCE_ROLE_NAMES = ['財務', '財務', 'finance', 'financial', 'accountant'];

  private readonly INTERNAL_ROLE_LABELS = [
    'office_clerk',
    'office_clerk_manager',
  ];

  private readonly INTERNAL_ROLE_LABEL = 'office_clerk';

  private readonly INTERNAL_MANAGER_ROLE_LABEL = 'office_clerk_manager';

  @InjectEntityModel(CrmPerformanceEntity)
  crmPerformanceEntity: Repository<CrmPerformanceEntity>;

  @InjectEntityModel(CrmBonusConfigEntity)
  crmBonusConfigEntity: Repository<CrmBonusConfigEntity>;

  @InjectEntityModel(CrmQuoteOrderEntity)
  crmQuoteOrderEntity: Repository<CrmQuoteOrderEntity>;

  @InjectEntityModel(CrmQuoteOrderItemEntity)
  crmQuoteOrderItemEntity: Repository<CrmQuoteOrderItemEntity>;

  @InjectEntityModel(CrmQuoteOrderStageEntity)
  crmQuoteOrderStageEntity: Repository<CrmQuoteOrderStageEntity>;

  @InjectEntityModel(BaseSysUserEntity)
  baseSysUserEntity: Repository<BaseSysUserEntity>;

  @InjectEntityModel(BaseSysRoleEntity)
  baseSysRoleEntity: Repository<BaseSysRoleEntity>;

  @InjectEntityModel(BaseSysDepartmentEntity)
  baseSysDepartmentEntity: Repository<BaseSysDepartmentEntity>;

  @Inject()
  crmBonusConfigService: any;

  @Inject()
  ctx: Context;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  @Inject()
  baseSysParamService: BaseSysParamService;

  @Inject()
  crmContractReminderService: CrmContractReminderService;

  async platformStatistics() {
    const now = moment();
    const scope = await this.getStatisticsScope();
    const quoteScope = this.buildQuoteStatisticsScopeSql(scope, 'q');
    const year = now.year();
    const month = now.month() + 1;
    const monthStart = now.clone().startOf('month').format('YYYY-MM-DD HH:mm:ss');
    const monthEnd = now.clone().endOf('month').format('YYYY-MM-DD HH:mm:ss');
    const lastMonthStart = now
      .clone()
      .subtract(1, 'month')
      .startOf('month')
      .format('YYYY-MM-DD HH:mm:ss');
    const lastMonthEnd = now
      .clone()
      .subtract(1, 'month')
      .endOf('month')
      .format('YYYY-MM-DD HH:mm:ss');
    const lastYearMonthStart = now
      .clone()
      .subtract(1, 'year')
      .startOf('month')
      .format('YYYY-MM-DD HH:mm:ss');
    const lastYearMonthEnd = now
      .clone()
      .subtract(1, 'year')
      .endOf('month')
      .format('YYYY-MM-DD HH:mm:ss');
    const lastYearLastMonthStart = now
      .clone()
      .subtract(1, 'year')
      .subtract(1, 'month')
      .startOf('month')
      .format('YYYY-MM-DD HH:mm:ss');
    const lastYearLastMonthEnd = now
      .clone()
      .subtract(1, 'year')
      .subtract(1, 'month')
      .endOf('month')
      .format('YYYY-MM-DD HH:mm:ss');
    const lastYear = year - 1;
    const months = Array.from({ length: month }, (_, index) => index + 1);

    const [
      currentMonthQuoteRows,
      lastMonthActualRows,
      lastYearLastMonthActualRows,
      lastYearMonthQuoteRows,
      currentMonthInvoiceRows,
      lastYearMonthInvoiceRows,
      dealMonthlyRows,
      invoiceMonthlyRows,
      dealLastYearRows,
      invoiceLastYearRows,
      productRows,
      industryRows,
      sendRows,
    ] = await Promise.all([
      this.nativeQuery(
        `
        SELECT
          COALESCE(SUM(q.finalAmount), 0) AS dealAmount,
          COALESCE(SUM(q.costAmount), 0) AS costAmount,
          COALESCE(SUM(q.grossProfitAmount), 0) AS grossProfitAmount
        FROM crm_quote_order q
        WHERE q.isDeleted = 0
          AND q.createTime >= ?
          AND q.createTime <= ?
          ${quoteScope.sql}
        `,
        [monthStart, monthEnd, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT
          COALESCE(SUM(s.receiptAmount), 0) AS receiptAmount,
          COALESCE(SUM(s.receiptAmount * COALESCE(q.grossProfitRate, 0)), 0) AS actualGrossProfit
        FROM crm_quote_order_stage s
        INNER JOIN crm_quote_order q ON q.id = s.quoteOrderId AND q.isDeleted = 0
        WHERE s.isDeleted = 0
          AND s.receiptTime >= ?
          AND s.receiptTime <= ?
          ${quoteScope.sql}
        `,
        [lastMonthStart, lastMonthEnd, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT
          COALESCE(SUM(s.receiptAmount), 0) AS receiptAmount,
          COALESCE(SUM(s.receiptAmount * COALESCE(q.grossProfitRate, 0)), 0) AS actualGrossProfit
        FROM crm_quote_order_stage s
        INNER JOIN crm_quote_order q ON q.id = s.quoteOrderId AND q.isDeleted = 0
        WHERE s.isDeleted = 0
          AND s.receiptTime >= ?
          AND s.receiptTime <= ?
          ${quoteScope.sql}
        `,
        [lastYearLastMonthStart, lastYearLastMonthEnd, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT
          COALESCE(SUM(q.finalAmount), 0) AS dealAmount,
          COALESCE(SUM(q.costAmount), 0) AS costAmount,
          COALESCE(SUM(q.grossProfitAmount), 0) AS grossProfitAmount
        FROM crm_quote_order q
        WHERE q.isDeleted = 0
          AND q.createTime >= ?
          AND q.createTime <= ?
          ${quoteScope.sql}
        `,
        [lastYearMonthStart, lastYearMonthEnd, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT COALESCE(SUM(i.amount), 0) AS invoiceAmount
        FROM crm_quote_invoice i
        INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId AND q.isDeleted = 0
        WHERE i.isDeleted = 0
          AND i.status = 2
          AND i.auditTime >= ?
          AND i.auditTime <= ?
          ${quoteScope.sql}
        `,
        [monthStart, monthEnd, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT COALESCE(SUM(i.amount), 0) AS invoiceAmount
        FROM crm_quote_invoice i
        INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId AND q.isDeleted = 0
        WHERE i.isDeleted = 0
          AND i.status = 2
          AND i.auditTime >= ?
          AND i.auditTime <= ?
          ${quoteScope.sql}
        `,
        [lastYearMonthStart, lastYearMonthEnd, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT MONTH(q.createTime) AS month, COALESCE(SUM(q.finalAmount), 0) AS amount
        FROM crm_quote_order q
        WHERE q.isDeleted = 0
          AND YEAR(q.createTime) = ?
          AND MONTH(q.createTime) <= ?
          ${quoteScope.sql}
        GROUP BY MONTH(q.createTime)
        `,
        [year, month, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT MONTH(i.auditTime) AS month, COALESCE(SUM(i.amount), 0) AS amount
        FROM crm_quote_invoice i
        INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId AND q.isDeleted = 0
        WHERE i.isDeleted = 0
          AND i.status = 2
          AND i.auditTime IS NOT NULL
          AND i.auditTime <> ''
          AND YEAR(i.auditTime) = ?
          AND MONTH(i.auditTime) <= ?
          ${quoteScope.sql}
        GROUP BY MONTH(i.auditTime)
        `,
        [year, month, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT MONTH(q.createTime) AS month, COALESCE(SUM(q.finalAmount), 0) AS amount
        FROM crm_quote_order q
        WHERE q.isDeleted = 0
          AND YEAR(q.createTime) = ?
          AND MONTH(q.createTime) <= ?
          ${quoteScope.sql}
        GROUP BY MONTH(q.createTime)
        `,
        [lastYear, month, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT MONTH(i.auditTime) AS month, COALESCE(SUM(i.amount), 0) AS amount
        FROM crm_quote_invoice i
        INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId AND q.isDeleted = 0
        WHERE i.isDeleted = 0
          AND i.status = 2
          AND i.auditTime IS NOT NULL
          AND i.auditTime <> ''
          AND YEAR(i.auditTime) = ?
          AND MONTH(i.auditTime) <= ?
          ${quoteScope.sql}
        GROUP BY MONTH(i.auditTime)
        `,
        [lastYear, month, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT
          COALESCE(NULLIF(i.productName, ''), '未填寫') AS name,
          COALESCE(SUM(i.subtotalAmount), 0) AS value
        FROM crm_quote_order_item i
        INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId AND q.isDeleted = 0
        WHERE i.isDeleted = 0
          AND YEAR(q.createTime) = ?
          ${quoteScope.sql}
        GROUP BY COALESCE(NULLIF(i.productName, ''), '未填寫')
        ORDER BY value DESC
        LIMIT 8
        `,
        [year, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT
          COALESCE(NULLIF(c.industry, ''), '未填寫') AS name,
          COALESCE(SUM(q.finalAmount), 0) AS value
        FROM crm_quote_order q
        LEFT JOIN crm_customer_info c ON c.id = q.customerId
        WHERE q.isDeleted = 0
          AND YEAR(q.createTime) = ?
          ${quoteScope.sql}
        GROUP BY COALESCE(NULLIF(c.industry, ''), '未填寫')
        ORDER BY value DESC
        LIMIT 8
        `,
        [year, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT
          CASE q.sendType
            WHEN 1 THEN '郵件發送'
            WHEN 2 THEN '手動標記'
            ELSE '未發送'
          END AS name,
          COUNT(1) AS value
        FROM crm_quote_order q
        WHERE q.isDeleted = 0
          AND YEAR(q.createTime) = ?
          ${quoteScope.sql}
        GROUP BY q.sendType
        ORDER BY value DESC
        `,
        [year, ...quoteScope.params]
      ),
    ]);

    const currentMonthQuote = currentMonthQuoteRows?.[0] || {};
    const lastMonthActual = lastMonthActualRows?.[0] || {};
    const lastYearLastMonthActual = lastYearLastMonthActualRows?.[0] || {};
    const lastYearMonthQuote = lastYearMonthQuoteRows?.[0] || {};
    const currentMonthInvoice = currentMonthInvoiceRows?.[0] || {};
    const lastYearMonthInvoice = lastYearMonthInvoiceRows?.[0] || {};

    const currentDeal = this.toMoney(currentMonthQuote.dealAmount);
    const currentCost = this.toMoney(currentMonthQuote.costAmount);
    const currentGrossProfit = this.toMoney(currentMonthQuote.grossProfitAmount);
    const lastMonthActualGrossProfit = this.toMoney(
      lastMonthActual.actualGrossProfit
    );
    const lastMonthReceiptAmount = this.toMoney(lastMonthActual.receiptAmount);
    const lastYearDeal = this.toMoney(lastYearMonthQuote.dealAmount);
    const lastYearCost = this.toMoney(lastYearMonthQuote.costAmount);
    const lastYearGrossProfit = this.toMoney(lastYearMonthQuote.grossProfitAmount);
    const currentInvoice = this.toMoney(currentMonthInvoice.invoiceAmount);
    const lastYearInvoice = this.toMoney(lastYearMonthInvoice.invoiceAmount);

    return {
      months: months.map(item => `${item}月`),
      metrics: [
        {
          label: '本月預估毛利',
          value: currentGrossProfit,
          rate: this.percent(currentDeal > 0 ? currentGrossProfit / currentDeal : 0),
          growth: this.growth(currentGrossProfit, lastYearGrossProfit),
        },
        {
          label: '上月實際毛利',
          value: lastMonthActualGrossProfit,
          rate: this.percent(
            lastMonthReceiptAmount > 0
              ? lastMonthActualGrossProfit / lastMonthReceiptAmount
              : 0
          ),
          growth: this.growth(
            lastMonthActualGrossProfit,
            this.toMoney(lastYearLastMonthActual.actualGrossProfit)
          ),
        },
        {
          label: '本月預估成本',
          value: currentCost,
          rate: this.percent(currentDeal > 0 ? currentCost / currentDeal : 0),
          growth: this.growth(currentCost, lastYearCost),
        },
        {
          label: '成交業績',
          value: currentDeal,
          rate: this.percent(currentGrossProfit > 0 ? currentGrossProfit / currentDeal : 0),
          growth: this.growth(currentDeal, lastYearDeal),
        },
        {
          label: '發票業績',
          value: currentInvoice,
          rate: this.percent(currentDeal > 0 ? currentInvoice / currentDeal : 0),
          growth: this.growth(currentInvoice, lastYearInvoice),
        },
      ],
      invoice: {
        amount: this.fillMonthly(months, invoiceMonthlyRows),
        yoy: this.fillYoy(months, invoiceMonthlyRows, invoiceLastYearRows),
      },
      deal: {
        amount: this.fillMonthly(months, dealMonthlyRows),
        yoy: this.fillYoy(months, dealMonthlyRows, dealLastYearRows),
      },
      pies: {
        product: this.normalizePieRows(productRows),
        industry: this.normalizePieRows(industryRows),
        send: this.normalizePieRows(sendRows),
      },
    };
  }

  async invoiceStatistics() {
    const now = moment();
    const scope = await this.getStatisticsScope();
    const quoteScope = this.buildQuoteStatisticsScopeSql(scope, 'q');
    const year = now.year();
    const currentMonth = now.month() + 1;
    const lastYear = year - 1;
    const months = Array.from({ length: 12 }, (_, index) => index + 1);

    const [
      receiptRows,
      invoiceRows,
      personalRows,
      personalLastYearRows,
      companyRows,
    ] = await Promise.all([
      this.nativeQuery(
        `
        SELECT MONTH(s.receiptTime) AS month, COALESCE(SUM(s.receiptAmount), 0) AS amount
        FROM crm_quote_order_stage s
        INNER JOIN crm_quote_order q ON q.id = s.quoteOrderId AND q.isDeleted = 0
        WHERE s.isDeleted = 0
          AND s.receiptTime IS NOT NULL
          AND s.receiptTime <> ''
          AND YEAR(s.receiptTime) = ?
          ${quoteScope.sql}
        GROUP BY MONTH(s.receiptTime)
        `,
        [year, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT MONTH(i.auditTime) AS month, COALESCE(SUM(i.amount), 0) AS amount
        FROM crm_quote_invoice i
        INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId AND q.isDeleted = 0
        WHERE i.isDeleted = 0
          AND i.status = 2
          AND i.auditTime IS NOT NULL
          AND i.auditTime <> ''
          AND YEAR(i.auditTime) = ?
          ${quoteScope.sql}
        GROUP BY MONTH(i.auditTime)
        `,
        [year, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT
          q.salesmanId,
          COALESCE(NULLIF(u.name, ''), NULLIF(u.nickName, ''), NULLIF(u.username, ''), '未分配') AS userName,
          MONTH(i.auditTime) AS month,
          COALESCE(SUM(i.amount), 0) AS amount
        FROM crm_quote_invoice i
        INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId AND q.isDeleted = 0
        LEFT JOIN base_sys_user u ON u.id = q.salesmanId
        WHERE i.isDeleted = 0
          AND i.status = 2
          AND i.auditTime IS NOT NULL
          AND i.auditTime <> ''
          AND YEAR(i.auditTime) = ?
          ${quoteScope.sql}
        GROUP BY q.salesmanId, userName, MONTH(i.auditTime)
        ORDER BY SUM(i.amount) DESC
        `,
        [year, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT
          q.salesmanId,
          COALESCE(SUM(i.amount), 0) AS amount
        FROM crm_quote_invoice i
        INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId AND q.isDeleted = 0
        WHERE i.isDeleted = 0
          AND i.status = 2
          AND i.auditTime IS NOT NULL
          AND i.auditTime <> ''
          AND YEAR(i.auditTime) = ?
          AND MONTH(i.auditTime) = ?
          ${quoteScope.sql}
        GROUP BY q.salesmanId
        `,
        [lastYear, currentMonth, ...quoteScope.params]
      ),
      this.nativeQuery(
        `
        SELECT
          q.id AS quoteOrderId,
          COALESCE(NULLIF(c.companyName, ''), NULLIF(c.contactName, ''), '未填寫') AS companyName,
          COALESCE(NULLIF(q.quoteName, ''), q.quoteNo, '未填寫') AS quoteName,
          COALESCE(NULLIF(c.industry, ''), '未填寫') AS industry,
          q.quoteType,
          q.startDate,
          q.endDate,
          MONTH(i.auditTime) AS month,
          COALESCE(SUM(i.amount), 0) AS amount
        FROM crm_quote_invoice i
        INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId AND q.isDeleted = 0
        LEFT JOIN crm_customer_info c ON c.id = q.customerId
        WHERE i.isDeleted = 0
          AND i.status = 2
          AND i.auditTime IS NOT NULL
          AND i.auditTime <> ''
          AND YEAR(i.auditTime) = ?
          ${quoteScope.sql}
        GROUP BY q.id, companyName, q.quoteName, q.quoteNo, industry, q.quoteType, q.startDate, q.endDate, MONTH(i.auditTime)
        ORDER BY q.createTime DESC, q.id DESC
        `,
        [year, ...quoteScope.params]
      ),
    ]);

    const personalLastYearMap = new Map<string, number>();
    (personalLastYearRows || []).forEach(row => {
      personalLastYearMap.set(String(row.salesmanId || 0), this.toMoney(row.amount));
    });

    const personalMap = new Map<
      string,
      { salesmanKey: string; userName: string; months: Map<number, number> }
    >();
    (personalRows || []).forEach(row => {
      const key = String(row.salesmanId || 0);
      if (!personalMap.has(key)) {
        personalMap.set(key, {
          salesmanKey: key,
          userName: String(row.userName || '未分配'),
          months: new Map<number, number>(),
        });
      }
      personalMap.get(key)?.months.set(Number(row.month || 0), this.toMoney(row.amount));
    });

    const companyMap = new Map<
      string,
      {
        companyName: string;
        quoteName: string;
        industry: string;
        period: string;
        months: Map<number, number>;
      }
    >();
    (companyRows || []).forEach(row => {
      const key = String(row.quoteOrderId || 0);
      if (!companyMap.has(key)) {
        companyMap.set(key, {
          companyName: String(row.companyName || '未填寫'),
          quoteName: String(row.quoteName || '未填寫'),
          industry: String(row.industry || '未填寫'),
          period: this.getProjectPeriodLabel(row),
          months: new Map<number, number>(),
        });
      }
      companyMap.get(key)?.months.set(Number(row.month || 0), this.toMoney(row.amount));
    });

    return {
      year,
      months: months.map(item => `${item}月`),
      chart: {
        receipt: this.fillMonthly(months, receiptRows),
        invoice: this.fillMonthly(months, invoiceRows),
      },
      personalRows: Array.from(personalMap.values()).map((row, index) => {
        const monthAmount = row.months.get(currentMonth) || 0;
        const totalAmount = months.reduce(
          (sum, month) => sum + (row.months.get(month) || 0),
          0
        );
        const previousAmount = personalLastYearMap.get(row.salesmanKey) || 0;
        return {
          index: index + 1,
          user: row.userName,
          current: monthAmount,
          average: this.toMoney(totalAmount / currentMonth),
          yoy: this.toYoyText(monthAmount, previousAmount),
          months: this.monthAmountRecord(months, row.months),
        };
      }),
      companyRows: Array.from(companyMap.values()).map((row, index) => ({
        index: index + 1,
        company: row.companyName,
        project: row.quoteName,
        industry: row.industry,
        period: row.period,
        months: this.monthAmountRecord(months, row.months),
      })),
    };
  }

  async page(query: any) {
    const month =
      this.normalizeMonth(query?.month) || moment().format('YYYY-MM');
    await this.refreshMonth(month);

    const { performanceName, status, phone, email, roleType } = query || {};
    const scope = await this.getPerformanceScope();
    const sql = `
      SELECT
        a.*,
        u.phone,
        u.email
      FROM crm_performance a
      LEFT JOIN base_sys_user u ON u.id = a.userId
      WHERE a.isDeleted = 0
        ${this.setSql(month, 'and a.performanceMonth = ?', [month])}
        ${this.setSql(performanceName, 'and a.performanceName like ?', [
          `%${performanceName}%`,
        ])}
        ${this.setSql(status, 'and a.status = ?', [Number(status)])}
        ${this.setSql(phone, 'and u.phone like ?', [`%${phone}%`])}
        ${this.setSql(email, 'and u.email like ?', [`%${email}%`])}
        ${this.setSql(roleType, 'and a.roleType = ?', [roleType])}
        ${this.setSql(!scope.isBoss, 'and a.userId = ?', [scope.userId])}
      ORDER BY a.performanceMonth DESC, a.userId ASC
    `;

    return await this.sqlRenderPage(sql, { ...query, month }, false);
  }

  async info(id: number | string) {
    const row = await this.getPerformanceById(Number(id));
    await this.ensureCanReadPerformance(row);
    return row;
  }

  async detail(param: any, type: DetailType) {
    const row = await this.getPerformanceById(Number(param?.id || 0));
    await this.ensureCanReadPerformance(row);
    const result = await this.calcUserMonth(
      row.userId,
      row.roleType,
      row.performanceMonth,
      type
    );
    return {
      id: row.id,
      performanceMonth: row.performanceMonth,
      performanceName: row.performanceName,
      userId: row.userId,
      userName: row.userName,
      roleType: row.roleType,
      type,
      ...result,
    };
  }

  async bonusAccountingPage(query: any) {
    const month =
      this.normalizeMonth(query?.month) || moment().format('YYYY-MM');
    await this.refreshMonth(month);

    const { employeeName, roleType, phone, email } = query || {};
    const scope = await this.getPerformanceScope();
    const canViewAll = scope.isBoss || (await this.isFinanceRole());
    const sql = `
      SELECT
        a.*,
        u.phone,
        u.email
      FROM crm_performance a
      LEFT JOIN base_sys_user u ON u.id = a.userId
      WHERE a.isDeleted = 0
        ${this.setSql(month, 'and a.performanceMonth = ?', [month])}
        ${this.setSql(employeeName, 'and a.userName like ?', [
          `%${employeeName}%`,
        ])}
        ${this.setSql(roleType, 'and a.roleType = ?', [roleType])}
        ${this.setSql(phone, 'and u.phone like ?', [`%${phone}%`])}
        ${this.setSql(email, 'and u.email like ?', [`%${email}%`])}
        ${this.setSql(!canViewAll, 'and a.userId = ?', [scope.userId])}
      ORDER BY a.performanceMonth DESC, a.userId ASC
    `;
    const page = await this.sqlRenderPage(sql, { ...query, month }, false);
    const list = await Promise.all(
      (page?.list || []).map(async item => {
        const metrics = await this.getBonusAccountingMetrics(
          Number(item.userId),
          item.roleType,
          item.performanceMonth
        );
        return {
          ...item,
          employeeName: item.userName,
          departmentName: item.roleType === 'sales' ? '業務' : '內勤',
          invoiceCount: metrics.invoiceCount,
          invoiceAmount: this.toMoney(item.invoiceAmount),
          grossProfitAmount: metrics.grossProfitAmount,
          bonusAmount: this.toMoney(item.actualBonus),
        };
      })
    );
    return { ...page, list };
  }

  async bonusAccountingDetail(param: any) {
    const row = await this.getPerformanceById(Number(param?.id || 0));
    const scope = await this.getPerformanceScope();
    const canViewAll = scope.isBoss || (await this.isFinanceRole());
    if (!canViewAll && Number(row.userId) !== scope.userId) {
      throw new CoolCommException('無權限檢視業績記錄');
    }
    const result = await this.calcUserMonth(
      row.userId,
      row.roleType,
      row.performanceMonth,
      'actual'
    );
    return {
      id: row.id,
      performanceMonth: row.performanceMonth,
      performanceName: row.performanceName,
      userId: row.userId,
      userName: row.userName,
      roleType: row.roleType,
      type: 'actual',
      ...result,
    };
  }

  async annualAssessmentPage(query: any) {
    const year = this.normalizeYear(query?.year) || moment().format('YYYY');
    const { employeeName, roleType, phone, email } = query || {};
    const scope = await this.getPerformanceScope();
    const users = (await this.getEligibleUsers()).filter(user => {
      if (!scope.isBoss && Number(user.id) !== scope.userId) {
        return false;
      }
      if (roleType && user.roleType !== roleType) {
        return false;
      }
      if (
        employeeName &&
        !String(user.name || '').includes(String(employeeName))
      ) {
        return false;
      }
      if (phone && !String(user.phone || '').includes(String(phone))) {
        return false;
      }
      if (email && !String(user.email || '').includes(String(email))) {
        return false;
      }
      return true;
    });

    const currentPage = Math.max(1, Number(query?.page || 1));
    const pageSize = Math.max(1, Number(query?.size || 20));
    const pageUsers = users.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
    const list = await Promise.all(
      pageUsers.map(user => this.calcAnnualAssessment(user, year, false))
    );

    return {
      list,
      pagination: {
        page: currentPage,
        size: pageSize,
        total: users.length,
      },
    };
  }

  async annualAssessmentDetail(param: any) {
    const year = this.normalizeYear(param?.year) || moment().format('YYYY');
    const userId = Number(param?.userId || 0);
    if (!userId) {
      throw new CoolCommException('考核人員不存在');
    }
    const scope = await this.getPerformanceScope();
    if (!scope.isBoss && scope.userId !== userId) {
      throw new CoolCommException('無權限檢視年度考核');
    }
    const user = (await this.getEligibleUsers()).find(
      item => Number(item.id) === userId
    );
    if (!user) {
      throw new CoolCommException('考核人員不存在');
    }
    return await this.calcAnnualAssessment(user, year, true);
  }

  async internalDetail(param: any) {
    const row = await this.getPerformanceById(Number(param?.id || 0));
    await this.ensureCanReadPerformance(row);
    if (row.roleType !== 'internal') {
      throw new CoolCommException('僅內勤業績可檢視該詳情');
    }
    const result = await this.calcUserMonth(
      row.userId,
      row.roleType,
      row.performanceMonth,
      'expected'
    );
    return {
      id: row.id,
      performanceMonth: row.performanceMonth,
      performanceName: row.performanceName,
      userId: row.userId,
      userName: row.userName,
      roleType: row.roleType,
      status: row.status,
      type: 'internal',
      ...result,
    };
  }

  async manualSyncMonth(month?: string) {
    await this.ensureBoss();
    return await this.syncMonth(month);
  }

  async syncMonth(month?: string) {
    const performanceMonth =
      this.normalizeMonth(month) || moment().format('YYYY-MM');
    const users = await this.getEligibleUsers();
    const range = this.getMonthRange(performanceMonth);
    let inserted = 0;

    for (const user of users) {
      const exists = await this.crmPerformanceEntity.findOneBy({
        performanceMonth,
        userId: user.id,
        roleType: user.roleType,
        isDeleted: 0,
      });
      if (exists) {
        continue;
      }
      await this.crmPerformanceEntity.save({
        performanceMonth,
        performanceName: `${Number(performanceMonth.slice(5, 7))}月獎金`,
        userId: user.id,
        userName: user.name,
        roleType: user.roleType,
        periodStart: range.start,
        periodEnd: range.end,
        invoiceAmount: 0,
        expectedBonus: 0,
        receiptAmount: 0,
        actualBonus: 0,
        status: 1,
        isDeleted: 0,
      });
      inserted++;
    }

    return {
      month: performanceMonth,
      inserted,
      totalUsers: users.length,
    };
  }

  async monthlyGenerate() {
    return await this.syncMonth(moment().format('YYYY-MM'));
  }

  private async refreshMonth(month: string) {
    const rows = await this.crmPerformanceEntity.find({
      where: { performanceMonth: month, isDeleted: 0 },
    });

    for (const row of rows) {
      const [expected, actual] = await Promise.all([
        this.calcUserMonth(
          row.userId,
          row.roleType,
          row.performanceMonth,
          'expected'
        ),
        this.calcUserMonth(
          row.userId,
          row.roleType,
          row.performanceMonth,
          'actual'
        ),
      ]);
      const nextStatus =
        actual.bonusTotal > 0 ? 3 : expected.bonusTotal > 0 ? 2 : 1;
      await this.crmPerformanceEntity.update(
        { id: row.id },
        {
          invoiceAmount: this.toMoney(expected.amountTotal),
          expectedBonus: this.toMoney(expected.bonusTotal),
          receiptAmount: this.toMoney(actual.amountTotal),
          actualBonus: this.toMoney(actual.bonusTotal),
          status: nextStatus,
        }
      );
    }
  }

  private async calcUserMonth(
    userId: number,
    roleType: string,
    month: string,
    type: DetailType
  ) {
    const range = this.getMonthRange(month);
    const user = await this.baseSysUserEntity.findOneBy({ id: userId });
    const ctx = await this.getBonusContext();
    if (roleType === 'internal') {
      return await this.calcInternalUserMonth(userId, user, range, ctx);
    }
    const sourceRows = await this.fetchStageRows(userId, roleType, range, type);
    const quoteIds: number[] = Array.from(
      new Set<number>(sourceRows.map(item => Number(item.quoteOrderId)))
    );
    const itemMap = await this.getQuoteItemProfiles(quoteIds, ctx);

    const rows = sourceRows.map(stage => {
      const profile =
        itemMap.get(Number(stage.quoteOrderId)) || this.emptyProfile();
      const rawSourceAmount =
        type === 'actual'
          ? this.toMoney(stage.receiptAmount || stage.amount)
          : this.toMoney(stage.amount);
      const sourceAmount = this.toUntaxedAmount(rawSourceAmount, ctx.dutyRate);
      const stageMetrics = this.calcSalesStageMetrics(stage, profile, sourceAmount, ctx);
      const discountDeductionAmount = this.toMoney(
        stage.discountDeductionAmount
      );
      return {
        ...stage,
        discountDeductionAmount,
        sourceAmount: rawSourceAmount,
        bonusBaseAmount: sourceAmount,
        mainProductRatio: profile.mainRatio,
        secondaryProductRatio: profile.secondaryRatio,
        ...stageMetrics,
      };
    });

    const monthlyMainAmount = rows.reduce(
      (sum, item) => sum + this.toMoney(item.mainPerformance),
      0
    );
    const hasTierAdd = monthlyMainAmount > ctx.tierAddThreshold;
    const passMainThreshold = monthlyMainAmount > ctx.mainMonthThreshold;
    const discountDeductionMap = new Map<number, number>();
    rows.forEach(item => {
      const quoteId = Number(item.quoteOrderId);
      const oldAmount = discountDeductionMap.get(quoteId) || 0;
      discountDeductionMap.set(
        quoteId,
        Math.max(oldAmount, this.toMoney(item.discountDeductionAmount))
      );
    });

    let detailBonusTotal = 0;
    const detailRows = rows.map(item => {
      const oneTimeAddRate =
        roleType === 'sales' && item.oneTimeEligibleMainPerformance > 0
          ? ctx.oneTimeRate
          : 0;
      const tierAddRate =
        roleType === 'sales' && hasTierAdd ? ctx.tierAddRate : 0;
      const mainRate = passMainThreshold
        ? ctx.salesMainRate + tierAddRate + oneTimeAddRate
        : 0;
      const secondaryRate = mainRate;
      const mainBonusBaseAmount = this.toMoney(item.mainPerformance);
      const mainBonus = this.toMoney((mainBonusBaseAmount * mainRate) / 100);
      const secondaryBonus = this.toMoney(
        (this.toMoney(item.secondaryPerformance) *
          this.toNumber(item.secondaryProfitRate) *
          secondaryRate) /
          100
      );
      const bonusAmount = this.toMoney(mainBonus + secondaryBonus);
      const quoteId = Number(item.quoteOrderId);
      const discountDeductionLeft = discountDeductionMap.get(quoteId) || 0;
      const discountDeductionAmount = this.toMoney(
        Math.min(bonusAmount, discountDeductionLeft)
      );
      const finalBonusAmount = this.toMoney(
        Math.max(0, bonusAmount - discountDeductionAmount)
      );
      if (discountDeductionAmount > 0) {
        discountDeductionMap.set(
          quoteId,
          this.toMoney(discountDeductionLeft - discountDeductionAmount)
        );
      }
      detailBonusTotal += finalBonusAmount;

      return {
        ...item,
        mainRate,
        secondaryRate,
        mainPerformanceAmount: mainBonusBaseAmount,
        secondaryPerformanceAmount: this.toMoney(item.secondaryPerformance),
        mainBonusBaseAmount,
        mainPerformance: mainBonus,
        secondaryPerformance: secondaryBonus,
        hasTierAdd: hasTierAdd ? 1 : 0,
        tierAddRate,
        oneTimeAddRate,
        oneTimeBonus: passMainThreshold
          ? this.toMoney(
              (this.toMoney(item.mainPerformance) * oneTimeAddRate) / 100
            )
          : 0,
        bonusBeforeDeduction: bonusAmount,
        discountDeductionAmount,
        bonusAmount: finalBonusAmount,
      };
    });

    const previousTierRange = this.getPreviousMonthRange(month);
    const previousTierBonusAmount =
      roleType === 'sales'
        ? await this.calcSalesTierBonusAmount(
            userId,
            roleType,
            previousTierRange,
            type,
            ctx
          )
        : 0;
    const tierBonus = this.resolveTierBonus(previousTierBonusAmount, ctx);
    const contractDeductionRows =
      roleType === 'sales'
        ? await this.crmContractReminderService.overdueDeductionRows(
            userId,
            range
          )
        : [];
    const contractDeductionTotal = this.toMoney(
      contractDeductionRows.reduce(
        (sum, item) => sum + this.toMoney(item.bonusAmount),
        0
      )
    );
    const caseMeetingDeductionRows =
      roleType === 'sales'
        ? await this.fetchCaseMeetingDeductionRows(userId, range)
        : [];
    const caseMeetingDeductionTotal = this.toMoney(
      caseMeetingDeductionRows.reduce(
        (sum, item) => sum + this.toMoney(item.bonusAmount),
        0
      )
    );
    const bonusTotal = this.toMoney(
      detailBonusTotal +
        tierBonus +
        contractDeductionTotal +
        caseMeetingDeductionTotal
    );
    const groups = this.groupDetailRows([
      ...detailRows,
      ...contractDeductionRows,
      ...caseMeetingDeductionRows,
    ]);

    return {
      periodStart: range.start,
      periodEnd: range.end,
      amountTotal: this.toMoney(
        rows.reduce((sum, item) => sum + this.toMoney(item.sourceAmount), 0)
      ),
      mainAmount: this.toMoney(monthlyMainAmount),
      secondaryAmount: this.toMoney(
        rows.reduce(
          (sum, item) => sum + this.toMoney(item.secondaryPerformance),
          0
        )
      ),
      bonusTotal,
      tierBonus,
      tierBonusAmount: previousTierBonusAmount,
      contractDeductionTotal,
      caseMeetingDeductionTotal,
      hasTierAdd: hasTierAdd ? 1 : 0,
      tierAddRate: hasTierAdd ? ctx.tierAddRate : 0,
      groups,
    };
  }

  private async fetchStageRows(
    userId: number,
    roleType: string,
    range: { start: string; end: string },
    type: DetailType
  ) {
    const isActual = type === 'actual';
    const dateField = isActual ? 's.receiptTime' : 'departmentAudit.auditTime';
    const auditTimeSelect = isActual ? 'q.auditTime' : 'departmentAudit.auditTime';
    const departmentAuditJoin = isActual
      ? ''
      : `
      INNER JOIN (
        SELECT
          quoteOrderId,
          MAX(auditTime) AS auditTime
        FROM crm_quote_order_department_audit
        WHERE isDeleted = 0
        GROUP BY quoteOrderId
        HAVING COUNT(1) > 0
          AND SUM(CASE WHEN auditStatus = 2 THEN 1 ELSE 0 END) = COUNT(1)
          AND SUM(CASE WHEN auditTime IS NOT NULL AND auditTime <> '' THEN 1 ELSE 0 END) = COUNT(1)
      ) departmentAudit ON departmentAudit.quoteOrderId = q.id
      `;
    const amountWhere =
      isActual
        ? 'AND s.receiptStatus = 1 AND s.receiptAmount > 0'
        : `
        AND q.auditStatus = 2
        `;
    const internalJoin =
      roleType === 'internal'
        ? `
          AND EXISTS (
            SELECT 1 FROM crm_quote_order_item qi
            WHERE qi.quoteOrderId = q.id
              AND qi.isDeleted = 0
              AND qi.departmentId = u.departmentId
          )
        `
        : '';
    const salesWhere =
      roleType === 'sales' ? 'AND q.salesmanId = ?' : 'AND u.id = ?';
    return await this.nativeQuery(
      `
      SELECT
        s.id AS stageId,
        s.quoteOrderId,
        s.stageNo,
        s.stageName,
        s.ratio,
        s.amount,
        s.invoiceDate,
        s.receiptTime,
        s.receiptAmount,
        s.receiptVoucher,
        q.quoteNo,
        q.quoteName,
        q.quoteType,
        q.finalAmount,
        q.discountDeductionAmount,
        q.discountRate,
        ${auditTimeSelect} AS auditTime,
        q.salesmanId,
        u.departmentId
      FROM crm_quote_order_stage s
      LEFT JOIN crm_quote_order q ON q.id = s.quoteOrderId
      ${departmentAuditJoin}
      LEFT JOIN base_sys_user u ON u.id = ?
      WHERE s.isDeleted = 0
        AND q.isDeleted = 0
        ${salesWhere}
        ${internalJoin}
        ${amountWhere}
        AND ${dateField} >= ?
        AND ${dateField} <= ?
      ORDER BY q.id ASC, s.sortNum ASC, s.id ASC
      `,
      roleType === 'sales'
        ? [userId, userId, range.start, range.end]
        : [userId, userId, range.start, range.end]
    );
  }

  private async calcSalesTierBonusAmount(
    userId: number,
    roleType: string,
    range: { start: string; end: string },
    type: DetailType,
    ctx: BonusContext
  ) {
    const sourceRows = await this.fetchStageRows(userId, roleType, range, type);
    const quoteIds: number[] = Array.from(
      new Set<number>(sourceRows.map(item => Number(item.quoteOrderId)))
    );
    const itemMap = await this.getQuoteItemProfiles(quoteIds, ctx);
    const rows = sourceRows.map(stage => {
      const profile =
        itemMap.get(Number(stage.quoteOrderId)) || this.emptyProfile();
      const rawSourceAmount =
        type === 'actual'
          ? this.toMoney(stage.receiptAmount || stage.amount)
          : this.toMoney(stage.amount);
      const sourceAmount = this.toUntaxedAmount(rawSourceAmount, ctx.dutyRate);
      return this.calcSalesStageMetrics(stage, profile, sourceAmount, ctx);
    });
    return this.calcSalesTierBonusAmountByRows(rows);
  }

  private async calcInternalUserMonth(
    userId: number,
    user: BaseSysUserEntity,
    range: { start: string; end: string },
    ctx: BonusContext
  ) {
    const sourceRows = await this.fetchInternalProductRows(userId, range, ctx);
    const departmentType = await this.resolveInternalDepartmentType(user);
    const accountingRows = this.filterInternalRowsByDepartmentRule(
      sourceRows,
      departmentType,
      ctx
    );
    const monthlyAllAmount = this.toMoney(
      accountingRows.reduce(
        (sum, item) => sum + this.toMoney(item.sourceAmount),
        0
      )
    );
    const isInternalManager = await this.isInternalManager(userId);
    let detailBonusTotal = 0;

    const detailRows = accountingRows.map(item => {
      const internalRate = this.resolveInternalRateByDepartment(
        user,
        monthlyAllAmount,
        ctx,
        isInternalManager,
        departmentType,
        item.quoteType
      );
      const bonusAmount = this.toMoney(
        (this.toMoney(item.sourceAmount) * internalRate) / 100
      );
      detailBonusTotal += bonusAmount;
      return {
        ...item,
        mainRate: item.mainProductRatio > 0 ? internalRate : 0,
        secondaryRate: item.secondaryProductRatio > 0 ? internalRate : 0,
        hasTierAdd: 0,
        tierAddRate: 0,
        oneTimeAddRate: 0,
        bonusAmount,
      };
    });

    const fixedBonusRows = this.resolveInternalFixedBonusRowsByDepartment(
      monthlyAllAmount,
      ctx,
      departmentType
    );
    const tierBonus = this.toMoney(
      fixedBonusRows.reduce(
        (sum, item) => sum + this.toMoney(item.bonusAmount),
        0
      )
    );
    const bonusTotal = this.toMoney(detailBonusTotal + tierBonus);

    return {
      periodStart: range.start,
      periodEnd: range.end,
      amountTotal: monthlyAllAmount,
      mainAmount: this.toMoney(
        detailRows.reduce(
          (sum, item) => sum + this.toMoney(item.mainPerformance),
          0
        )
      ),
      secondaryAmount: this.toMoney(
        detailRows.reduce(
          (sum, item) => sum + this.toMoney(item.secondaryPerformance),
          0
        )
      ),
      bonusTotal,
      tierBonus,
      fixedBonusRows,
      hasTierAdd: 0,
      tierAddRate: 0,
      groups: this.groupDetailRows(detailRows),
    };
  }

  private async fetchCaseMeetingDeductionRows(
    userId: number,
    range: { start: string; end: string }
  ) {
    const rows = await this.nativeQuery(
      `
      SELECT DISTINCT
        q.id AS quoteOrderId,
        q.quoteNo,
        q.quoteName,
        q.quoteType,
        q.contractUploadTime
      FROM crm_quote_order q
      WHERE q.isDeleted = 0
        AND q.contractStatus = 1
        AND COALESCE(q.caseMeetingFlag, 1) = 0
        AND q.contractUploadTime IS NOT NULL
        AND q.contractUploadTime <> ''
        AND q.contractUploadTime >= ?
        AND q.contractUploadTime <= ?
        AND q.contractUploadTime <= NOW()
        AND q.salesmanId = ?
      ORDER BY q.contractUploadTime ASC, q.id ASC
      `,
      [range.start, range.end, userId]
    );

    return rows.map(row => ({
      ...row,
      stageId: `case-meeting-${row.quoteOrderId}`,
      stageNo: 0,
      stageName: '案情會議未召開扣業務員獎金',
      ratio: 0,
      amount: 0,
      sourceAmount: 0,
      bonusBaseAmount: 0,
      invoiceDate: row.contractUploadTime,
      receiptTime: row.contractUploadTime,
      receiptAmount: 0,
      receiptVoucher: '',
      mainProductRatio: 0,
      secondaryProductRatio: 0,
      grossProfitAmount: 0,
      mainPerformance: 0,
      secondaryPerformance: 0,
      secondaryGrossProfit: 0,
      isOneTimePayment: 0,
      isCaseMeetingDeduction: 1,
      bonusAmount: -500,
    }));
  }

  private async fetchInternalProductRows(
    userId: number,
    range: { start: string; end: string },
    ctx: BonusContext
  ) {
    const rows = await this.nativeQuery(
      `
      SELECT
        qi.id AS itemId,
        qi.quoteOrderId,
        qi.sortNum AS stageNo,
        qi.productName,
        qi.specName,
        qi.subtotalAmount,
        qi.grossProfitAmount,
        qi.departmentId,
        q.quoteNo,
        q.quoteName,
        q.quoteType,
        q.startDate,
        q.endDate,
        da.auditUserId,
        da.assigneeId,
        da.costUserId,
        da.auditTime,
        da.costTime
      FROM crm_quote_order_item qi
      INNER JOIN crm_quote_order q ON q.id = qi.quoteOrderId
      INNER JOIN base_sys_user u ON u.id = ?
      INNER JOIN crm_quote_order_department_audit da
        ON da.quoteOrderId = q.id
       AND da.departmentId = qi.departmentId
       AND da.isDeleted = 0
       AND da.auditStatus = 2
      WHERE qi.isDeleted = 0
        AND q.isDeleted = 0
        AND q.startDate IS NOT NULL
        AND q.endDate IS NOT NULL
        AND q.startDate <= ?
        AND q.endDate >= ?
        AND da.auditStatus = 2
        AND da.assignStatus = 2
        AND da.costStatus = 1
        AND da.assigneeId = ?
        AND da.costUserId = ?
        AND qi.departmentId = u.departmentId
      ORDER BY q.id ASC, qi.sortNum ASC, qi.id ASC
      `,
      [userId, range.end, range.start, userId, userId]
    );

    return rows.map(row => {
      const monthCount = this.getProjectMonthCount(row.startDate, row.endDate);
      const sourceAmount = this.toMoney(
        this.toMoney(row.subtotalAmount) / monthCount
      );
      const grossRate =
        this.toMoney(row.subtotalAmount) > 0
          ? (this.toMoney(row.grossProfitAmount) /
              this.toMoney(row.subtotalAmount)) *
            100
          : 0;
      const isMain = grossRate >= ctx.mainMarginThreshold;
      const grossProfitAmount = this.toMoney(
        this.toMoney(row.grossProfitAmount) / monthCount
      );
      return {
        stageId: row.itemId,
        quoteOrderId: row.quoteOrderId,
        stageNo: row.stageNo,
        stageName: `${row.productName || ''}${
          row.specName ? ` / ${row.specName}` : ''
        }`,
        ratio: monthCount > 0 ? 1 / monthCount : 1,
        amount: sourceAmount,
        sourceAmount,
        grossProfitAmount,
        invoiceDate: `${row.startDate || ''} —— ${row.endDate || ''}`,
        receiptTime: row.costTime || row.auditTime || '',
        receiptAmount: sourceAmount,
        receiptVoucher: '',
        quoteNo: row.quoteNo,
        quoteName: row.quoteName,
        quoteType: row.quoteType,
        grossRate,
        mainProductRatio: isMain ? 1 : 0,
        secondaryProductRatio: isMain ? 0 : 1,
        mainPerformance: isMain ? sourceAmount : 0,
        secondaryPerformance: isMain ? 0 : sourceAmount,
        secondaryGrossProfit: isMain ? 0 : grossProfitAmount,
        isOneTimePayment: 0,
      };
    });
  }

  private async getQuoteItemProfiles(quoteIds: number[], ctx: BonusContext) {
    const map = new Map<number, any>();
    if (quoteIds.length === 0) {
      return map;
    }
    const items = await this.nativeQuery(
      `
      SELECT
        qi.*,
        pi.isOneTimePayment AS isOneTimePayment,
        pc.name AS categoryName
      FROM crm_quote_order_item qi
      LEFT JOIN product_info pi ON pi.id = qi.productId AND pi.isDeleted = 0
      LEFT JOIN product_category pc ON pc.id = pi.categoryId AND pc.isDeleted = 0
      WHERE qi.quoteOrderId in (?)
        AND qi.isDeleted = 0
      ORDER BY qi.sortNum ASC, qi.id ASC
      `,
      [quoteIds]
    );
    const byQuote = new Map<number, any[]>();
    items.forEach(item => {
      const list = byQuote.get(Number(item.quoteOrderId)) || [];
      list.push(item);
      byQuote.set(Number(item.quoteOrderId), list);
    });

    byQuote.forEach((list, quoteId) => {
      const totalAmount = list.reduce(
        (sum, item) => sum + this.toMoney(item.subtotalAmount),
        0
      );
      const mainItems = list.filter(item => this.isMainQuoteItem(item));
      const secondaryItems = list.filter(item => !this.isMainQuoteItem(item));
      const oneTimeEligibleMainItems = mainItems.filter(
        item => !this.isOneTimeAddExcludedCategory(item)
      );
      const mainAmount = mainItems.reduce(
        (sum, item) => sum + this.toMoney(item.subtotalAmount),
        0
      );
      const oneTimeEligibleMainAmount = oneTimeEligibleMainItems.reduce(
        (sum, item) => sum + this.toMoney(item.subtotalAmount),
        0
      );
      const secondaryAmount = secondaryItems.reduce(
        (sum, item) => sum + this.toMoney(item.subtotalAmount),
        0
      );
      const grossProfitAmount = list.reduce(
        (sum, item) => sum + this.toMoney(item.grossProfitAmount),
        0
      );
      const secondaryGrossProfit = secondaryItems.reduce(
        (sum, item) => sum + this.toMoney(item.grossProfitAmount),
        0
      );
      const secondaryOriginalCostAmount = this.toMoney(
        secondaryAmount - secondaryGrossProfit
      );
      const mainRatio = this.toProductRatio(mainAmount, totalAmount);
      const oneTimeEligibleMainRatio = this.toProductRatio(
        oneTimeEligibleMainAmount,
        totalAmount
      );
      const secondaryRatio = this.toProductRatio(secondaryAmount, totalAmount);
      const secondarySalesAmount = this.toMoney(totalAmount * secondaryRatio);
      const secondaryCostAmount = this.toMoney(
        secondaryOriginalCostAmount
      );
      map.set(quoteId, {
        mainRatio,
        totalAmount,
        mainAmount,
        secondaryAmount,
        secondarySalesAmount,
        items: list,
        oneTimeEligibleMainRatio,
        secondaryRatio,
        grossProfitRatio: totalAmount > 0 ? grossProfitAmount / totalAmount : 0,
        grossProfitAmount,
        secondaryGrossProfitAmount: secondaryGrossProfit,
        secondaryCostAmount,
        secondaryGrossProfitRatio:
          totalAmount > 0 ? secondaryGrossProfit / totalAmount : 0,
      });
    });

    return map;
  }

  private calcSalesStageMetrics(
    stage: any,
    profile: any,
    sourceAmount: number,
    ctx: BonusContext
  ) {
    const stageNo = Number(stage?.stageNo || 1);
    const stageRatio = this.toNumber(stage?.ratio);
    const taxableRatio = 1 + (ctx.dutyRate || 0);
    const oneTimeItems = (Array.isArray(profile.items) ? profile.items : [])
      .filter((item: any) => Number(item?.isOneTimePayment || 0) === 1)
      .filter((item: any) => !this.isOneTimeAddExcludedCategory(item));
    const nonOneTimeAmount = this.toMoney(
      this.toMoney(profile.totalAmount) -
        oneTimeItems.reduce(
          (sum: number, item: any) => sum + this.toMoney(item.subtotalAmount),
          0
        )
    );
    const totalOneTimeMainAmount = this.toMoney(
      oneTimeItems
        .filter((item: any) => this.isMainQuoteItem(item))
        .reduce(
          (sum: number, item: any) => sum + this.toMoney(item.subtotalAmount),
          0
        )
    );
    const currentOneTimeMainAmount = this.toMoney(
      stageNo === 1 ? totalOneTimeMainAmount : 0
    );
    const nonOneTimeMainAmount = this.toMoney(
      (this.toMoney(profile.mainAmount) - totalOneTimeMainAmount) * stageRatio
    );
    const mainPerformance = this.toMoney(
      currentOneTimeMainAmount + nonOneTimeMainAmount
    );
    const secondaryPerformance = this.toMoney(
      this.toMoney(profile.secondaryAmount) * stageRatio
    );
    const secondaryGrossProfit = this.toMoney(
      this.toMoney(profile.secondaryGrossProfitAmount) * stageRatio
    );
    const grossProfitAmount = this.toMoney(
      this.toMoney(profile.grossProfitAmount) * stageRatio
    );
    const stageMainBaseAmount = this.toMoney(
      sourceAmount * this.toMoney(profile.mainRatio * 100) / 100
    );
    const stageSecondaryBaseAmount = this.toMoney(
      sourceAmount * this.toMoney(profile.secondaryRatio * 100) / 100
    );
    const secondaryCostRatio =
      this.toMoney(profile.secondarySalesAmount) > 0
        ? this.toMoney(profile.secondaryCostAmount) /
          this.toMoney(profile.secondarySalesAmount)
        : 0;
    const secondaryStageCostAmount = this.toMoney(
      stageSecondaryBaseAmount * secondaryCostRatio
    );
    const secondaryStageProfitAmount = this.toMoney(
      stageSecondaryBaseAmount - secondaryStageCostAmount
    );
    const secondaryProfitRate =
      stageSecondaryBaseAmount > 0
        ? secondaryStageProfitAmount / stageSecondaryBaseAmount
        : 0;

    return {
      grossProfitAmount,
      mainPerformance: stageMainBaseAmount,
      secondaryPerformance: stageSecondaryBaseAmount,
      secondaryGrossProfit: secondaryStageProfitAmount,
      secondaryProfitRate,
      oneTimeEligibleMainPerformance: currentOneTimeMainAmount,
      isOneTimePayment:
        currentOneTimeMainAmount > 0 || nonOneTimeAmount <= 0 ? 1 : 0,
      sourceAmount: this.toMoney(
        sourceAmount || (stage.amount || 0) / taxableRatio
      ),
    };
  }

  private groupDetailRows(rows: any[]) {
    const map = new Map<number, any>();
    rows.forEach(row => {
      const quoteId = Number(row.quoteOrderId);
      const old = map.get(quoteId) || {
        quoteOrderId: quoteId,
        quoteName: row.quoteName,
        quoteNo: row.quoteNo,
        quoteType: row.quoteType,
        mainProductRatio: row.mainProductRatio,
        secondaryProductRatio: row.secondaryProductRatio,
        isOneTimePayment: row.isOneTimePayment,
        amountTotal: 0,
        bonusTotal: 0,
        stages: [],
      };
      old.amountTotal = this.toMoney(
        old.amountTotal + this.toMoney(row.sourceAmount)
      );
      old.bonusTotal = this.toMoney(
        old.bonusTotal + this.toMoney(row.bonusAmount)
      );
      old.stages.push(row);
      map.set(quoteId, old);
    });
    return Array.from(map.values());
  }

  private async getBonusContext(): Promise<BonusContext> {
    if (this.crmBonusConfigService?.initDefaultConfigs) {
      await this.crmBonusConfigService.initDefaultConfigs();
    }
    const rows = await this.crmBonusConfigEntity.find({
      where: { isDeleted: 0, isEnabled: 1 },
    });
    const duty = await this.baseSysParamService.dataByKey('duty');
    const config = new Map<string, number>();
    rows.forEach(item =>
      config.set(item.configCode, this.toNumber(item.configValue))
    );
    return {
      config,
      mainMarginThreshold: this.configValue(
        config,
        'sales_main_product_margin_rate',
        50
      ),
      salesMainRate: this.configValue(
        config,
        'sales_main_product_bonus_rate',
        5
      ),
      salesSecondaryRate: this.configValue(
        config,
        'sales_secondary_product_bonus_rate',
        5
      ),
      oneTimeRate: this.configValue(
        config,
        'sales_one_time_payment_bonus_rate',
        0.5
      ),
      dutyRate: this.parseDutyRate(duty),
      mainMonthThreshold: this.configValue(
        config,
        'sales_main_invoice_month_threshold',
        300000
      ),
      tierAddThreshold: this.configValue(
        config,
        'sales_tier_add_bonus_threshold',
        800000
      ),
      tierAddRate: this.configValue(config, 'sales_tier_add_bonus_rate', 1),
      tierBonusList: [
        {
          threshold: 2000000,
          amount: this.configValue(config, 'sales_tier_bonus_200w', 20000),
        },
        {
          threshold: 1500000,
          amount: this.configValue(config, 'sales_tier_bonus_150w', 15000),
        },
        {
          threshold: 1200000,
          amount: this.configValue(config, 'sales_tier_bonus_120w', 8000),
        },
        {
          threshold: 1000000,
          amount: this.configValue(config, 'sales_tier_bonus_100w', 6000),
        },
      ],
    };
  }

  private resolveTierBonus(amount: number, ctx: BonusContext) {
    const match = ctx.tierBonusList.find(item => amount >= item.threshold);
    return this.toMoney(match?.amount || 0);
  }

  private resolveInternalFixedBonus(amount: number, ctx: BonusContext) {
    return this.toMoney(
      this.resolveInternalKoubeiTierBonus(amount, ctx) +
        this.resolveInternalSpecialBonus(amount, ctx)
    );
  }

  private resolveInternalKoubeiTierBonus(amount: number, ctx: BonusContext) {
    if (amount >= 950000)
      return this.configValue(
        ctx.config,
        'internal_koubei_avg_95w_bonus',
        8000
      );
    if (amount >= 850000)
      return this.configValue(
        ctx.config,
        'internal_koubei_avg_85w_bonus',
        6000
      );
    if (amount >= 750000)
      return this.configValue(
        ctx.config,
        'internal_koubei_avg_75w_bonus',
        4000
      );
    if (amount >= 650000)
      return this.configValue(
        ctx.config,
        'internal_koubei_avg_65w_bonus',
        2000
      );
    return 0;
  }

  private resolveInternalSpecialBonus(amount: number, ctx: BonusContext) {
    if (amount < 1000000) {
      return 0;
    }
    return this.configValue(
      ctx.config,
      'internal_personal_case_100w_bonus',
      10000
    );
  }

  private resolveIntegrationInternalFixedBonus(
    amount: number,
    ctx: BonusContext
  ) {
    if (
      amount >=
      this.configValue(
        ctx.config,
        'internal_integration_case_200w_threshold',
        2000000
      )
    ) {
      return this.configValue(
        ctx.config,
        'internal_integration_case_200w_bonus',
        5000
      );
    }
    return 0;
  }

  private resolveInternalFixedBonusByDepartment(
    amount: number,
    ctx: BonusContext,
    departmentType: InternalDepartmentType
  ) {
    if (departmentType === 'koubei') {
      return this.resolveInternalFixedBonus(amount, ctx);
    }
    if (departmentType === 'integration') {
      return this.resolveIntegrationInternalFixedBonus(amount, ctx);
    }
    return 0;
  }

  private resolveInternalFixedBonusRowsByDepartment(
    amount: number,
    ctx: BonusContext,
    departmentType: InternalDepartmentType
  ) {
    if (departmentType === 'koubei') {
      const rows = [];
      const tierBonus = this.toMoney(
        this.resolveInternalKoubeiTierBonus(amount, ctx)
      );
      const specialBonus = this.toMoney(
        this.resolveInternalSpecialBonus(amount, ctx)
      );
      if (tierBonus > 0) {
        rows.push({
          bonusName: '口碑部門級距獎勵',
          bonusAmount: tierBonus,
        });
      }
      if (specialBonus > 0) {
        rows.push({
          bonusName: '口碑部門特殊獎勵',
          bonusAmount: specialBonus,
        });
      }
      return rows;
    }
    const integrationBonus = this.toMoney(
      this.resolveInternalFixedBonusByDepartment(amount, ctx, departmentType)
    );
    return integrationBonus > 0
      ? [
          {
            bonusName: '整合部門級距獎勵',
            bonusAmount: integrationBonus,
          },
        ]
      : [];
  }

  private resolveInternalRate(
    user: BaseSysUserEntity,
    amount: number,
    ctx: BonusContext,
    isInternalManager: boolean,
    quoteType?: any
  ) {
    const isRenewal = this.isRenewalQuote(quoteType);
    const level = String(user?.level || '').toLowerCase();
    const isSenior = level.includes('資深') || level.includes('senior');
    if (isInternalManager) {
      if (isRenewal) {
        return this.configValue(
          ctx.config,
          'internal_koubei_manager_renewal_rate',
          2
        );
      }
      if (amount < 500000)
        return this.configValue(
          ctx.config,
          'internal_koubei_manager_under_50w_rate',
          1.5
        );
      if (amount < 600000)
        return this.configValue(
          ctx.config,
          'internal_koubei_manager_50_59w_rate',
          1.8
        );
      return this.configValue(
        ctx.config,
        'internal_koubei_manager_over_60w_rate',
        1.8
      );
    }
    if (isSenior) {
      if (isRenewal) {
        return this.configValue(
          ctx.config,
          'internal_koubei_senior_renewal_rate',
          2
        );
      }
      if (amount < 500000) return 0;
      if (amount < 600000)
        return this.configValue(
          ctx.config,
          'internal_koubei_senior_50_59w_rate',
          1.2
        );
      return this.configValue(
        ctx.config,
        'internal_koubei_senior_over_60w_rate',
        1.5
      );
    }
    if (isRenewal) {
      return this.configValue(
        ctx.config,
        'internal_koubei_staff_renewal_rate',
        1.5
      );
    }
    if (amount < 500000) return 0;
    if (amount < 600000)
      return this.configValue(
        ctx.config,
        'internal_koubei_staff_50_59w_rate',
        0.8
      );
    return this.configValue(
      ctx.config,
      'internal_koubei_staff_over_60w_rate',
      1.2
    );
  }

  private resolveInternalRateByDepartment(
    user: BaseSysUserEntity,
    amount: number,
    ctx: BonusContext,
    isInternalManager: boolean,
    departmentType: InternalDepartmentType,
    quoteType?: any
  ) {
    if (departmentType !== 'koubei') {
      return 0;
    }
    return this.resolveInternalRate(
      user,
      amount,
      ctx,
      isInternalManager,
      quoteType
    );
  }

  private filterInternalRowsByDepartmentRule(
    rows: any[],
    departmentType: InternalDepartmentType,
    ctx: BonusContext
  ) {
    if (departmentType === 'koubei') {
      return rows;
    }
    if (departmentType === 'integration') {
      const threshold = this.configValue(
        ctx.config,
        'internal_integration_margin_threshold',
        50
      );
      return rows
        .filter(item => this.toNumber(item.grossRate) > threshold)
        .map(item => ({
          ...item,
          mainProductRatio: 1,
          secondaryProductRatio: 0,
          mainPerformance: item.sourceAmount,
          secondaryPerformance: 0,
          secondaryGrossProfit: 0,
        }));
    }
    return [];
  }

  private async resolveInternalDepartmentType(
    user: BaseSysUserEntity
  ): Promise<InternalDepartmentType> {
    let departmentId = Number(user?.departmentId || 0);
    for (let index = 0; departmentId && index < 5; index++) {
      const rows = await this.nativeQuery(
        `
        SELECT id, name, parentId
        FROM base_sys_department
        WHERE id = ?
        LIMIT 1
        `,
        [departmentId]
      );
      const department = rows?.[0];
      if (!department) {
        break;
      }
      const departmentName = String(department.name || '');
      if (departmentName.includes('口碑')) {
        return 'koubei';
      }
      if (departmentName.includes('整合')) {
        return 'integration';
      }
      departmentId = Number(department.parentId || 0);
    }
    return 'other';
  }

  private async isInternalManager(userId: number) {
    const rows = await this.nativeQuery(
      `
      SELECT 1
      FROM base_sys_user_role ur
      INNER JOIN base_sys_role r ON r.id = ur.roleId
      WHERE ur.userId = ?
        AND r.label = ?
      LIMIT 1
      `,
      [userId, 'office_clerk_manager']
    );
    return rows.length > 0;
  }

  private async getEligibleUsers(): Promise<EligibleUser[]> {
    const rows = await this.nativeQuery(
      `
      SELECT
        u.id,
        u.name,
        u.username,
        u.phone,
        u.email,
        u.departmentId,
        u.salary,
        u.withholdingSalary,
        u.level,
        u.remark,
        GROUP_CONCAT(r.label) AS roleLabels
      FROM base_sys_user u
      INNER JOIN base_sys_user_role ur ON ur.userId = u.id
      INNER JOIN base_sys_role r ON r.id = ur.roleId
      WHERE u.status = 1
        AND r.label IN (?)
      GROUP BY u.id
      ORDER BY u.id ASC
      `,
      [[SALESMAN_ROLE_LABEL, ...this.INTERNAL_ROLE_LABELS]]
    );
    return rows.map(row => {
      const labels = String(row.roleLabels || '').split(',');
      return {
        id: Number(row.id),
        name: row.name || row.username || `使用者${row.id}`,
        phone: row.phone,
        email: row.email,
        departmentId: row.departmentId,
        salary: this.toMoney(row.salary),
        withholdingSalary: this.toMoney(row.withholdingSalary),
        level: row.level,
        remark: row.remark,
        roleType: labels.includes(SALESMAN_ROLE_LABEL) ? 'sales' : 'internal',
      };
    });
  }

  private async getPerformanceById(id: number) {
    if (!id) {
      throw new CoolCommException('業績記錄不存在');
    }
    const row = await this.crmPerformanceEntity.findOneBy({ id, isDeleted: 0 });
    if (!row) {
      throw new CoolCommException('業績記錄不存在');
    }
    return row;
  }

  private async ensureCanReadPerformance(row: CrmPerformanceEntity) {
    const scope = await this.getPerformanceScope();
    if (scope.isBoss) {
      return;
    }
    if (Number(row.userId) !== scope.userId) {
      throw new CoolCommException('無權限檢視業績記錄');
    }
  }

  private async ensureBoss() {
    const scope = await this.getPerformanceScope();
    if (!scope.isBoss) {
      throw new CoolCommException('無權限操作業績記錄');
    }
  }

  private async getPerformanceScope(): Promise<PerformanceScope> {
    const userId = Number(this.ctx?.admin?.userId || 0);
    const roleIds: number[] = this.ctx?.admin?.roleIds || [];
    if (!userId) {
      return { userId: 0, isBoss: true };
    }
    const isBoss = await this.baseSysPermsService.isAdmin(roleIds);
    return { userId, isBoss };
  }

  private async isFinanceRole(): Promise<boolean> {
    const roleIds: number[] = this.ctx?.admin?.roleIds || [];
    if (!roleIds.length) {
      return false;
    }
    const roles = await this.baseSysRoleEntity.findBy({ id: In(roleIds) });
    return roles.some(role => {
      const label = String(role.label || '').toLowerCase();
      const name = String(role.name || '').toLowerCase();
      return (
        this.FINANCE_ROLE_LABELS.includes(label) ||
        this.FINANCE_ROLE_NAMES.some(item => name.includes(item.toLowerCase()))
      );
    });
  }

  private async getStatisticsScope(): Promise<StatisticsScope> {
    const userId = Number(this.ctx?.admin?.userId || 0);
    const roleIds: number[] = this.ctx?.admin?.roleIds || [];
    if (!userId) {
      return {
        userId: 0,
        departmentIds: [],
        departmentUserIds: [],
        isBoss: true,
        isOfficeClerkManager: false,
        isOfficeClerk: false,
      };
    }

    const roles = roleIds.length
      ? await this.baseSysRoleEntity.findBy({ id: In(roleIds) })
      : [];
    const roleLabels = roles.map(item => item.label);
    const isBoss =
      this.ctx?.admin?.username === 'admin' ||
      roleLabels.some(label => this.SUPER_ROLE_LABELS.includes(label));
    const isOfficeClerkManager =
      isBoss || roleLabels.includes(this.INTERNAL_MANAGER_ROLE_LABEL);
    const isOfficeClerk = roleLabels.includes(this.INTERNAL_ROLE_LABEL);
    const departmentIds =
      isOfficeClerkManager || isOfficeClerk
        ? await this.getCurrentDepartmentIds(userId)
        : [];
    const departmentUserIds = departmentIds.length
      ? await this.getDepartmentUserIds(departmentIds)
      : [];

    return {
      userId,
      departmentIds,
      departmentUserIds,
      isBoss,
      isOfficeClerkManager,
      isOfficeClerk,
    };
  }

  private buildQuoteStatisticsScopeSql(
    scope: StatisticsScope,
    quoteAlias = 'q'
  ): { sql: string; params: any[] } {
    if (scope.isBoss) {
      return { sql: '', params: [] };
    }

    if (scope.isOfficeClerkManager) {
      return {
        sql: `
          AND (
            EXISTS (
              SELECT 1
              FROM crm_quote_order_department_audit da
              WHERE da.quoteOrderId = ${quoteAlias}.id
                AND da.isDeleted = 0
                AND (
                  da.departmentId IN (?)
                  OR da.assigneeId IN (?)
                )
            )
            OR ${quoteAlias}.currentAssigneeId IN (?)
          )
        `,
        params: [
          scope.departmentIds.length ? scope.departmentIds : [null],
          scope.departmentUserIds.length ? scope.departmentUserIds : [null],
          scope.departmentUserIds.length ? scope.departmentUserIds : [null],
        ],
      };
    }

    if (scope.isOfficeClerk) {
      return {
        sql: `
          AND (
            ${quoteAlias}.currentAssigneeId = ?
            OR EXISTS (
              SELECT 1
              FROM crm_quote_order_department_audit da
              WHERE da.quoteOrderId = ${quoteAlias}.id
                AND da.isDeleted = 0
                AND da.assigneeId = ?
            )
          )
        `,
        params: [scope.userId, scope.userId],
      };
    }

    return {
      sql: `AND ${quoteAlias}.salesmanId = ?`,
      params: [scope.userId],
    };
  }

  private async getCurrentDepartmentIds(userId: number) {
    const user = await this.baseSysUserEntity.findOneBy({ id: userId });
    const rootDepartmentId = Number(user?.departmentId || 0);
    if (!rootDepartmentId) {
      return [];
    }
    return this.getDepartmentAndChildrenIds(rootDepartmentId);
  }

  private async getDepartmentUserIds(departmentIds: number[]) {
    const users = await this.baseSysUserEntity.find({
      select: ['id'],
      where: {
        departmentId: In(departmentIds.length ? departmentIds : [0]),
        status: 1,
      },
    });
    return users.map(item => Number(item.id)).filter(id => id > 0);
  }

  private async getDepartmentAndChildrenIds(rootDepartmentId: number) {
    const departments = await this.baseSysDepartmentEntity.find();
    const ids = new Set<number>([rootDepartmentId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const department of departments) {
        const id = Number(department.id || 0);
        const parentId = Number(department.parentId || 0);
        if (id && parentId && ids.has(parentId) && !ids.has(id)) {
          ids.add(id);
          changed = true;
        }
      }
    }
    return [...ids];
  }

  private getMonthRange(month: string) {
    const start = moment(`${month}-01`)
      .startOf('month')
      .format('YYYY-MM-DD HH:mm:ss');
    const end = moment(`${month}-01`)
      .endOf('month')
      .format('YYYY-MM-DD HH:mm:ss');
    return { start, end };
  }

  private getPreviousMonthRange(month: string) {
    const previous = moment(`${month}-01`).subtract(1, 'month').format('YYYY-MM');
    return this.getMonthRange(previous);
  }

  private calcSalesTierBonusAmountByRows(rows: any[]) {
    return this.toMoney(
      rows.reduce(
        (sum, item) =>
          sum +
          this.toMoney(item.mainPerformance) +
          this.toMoney(item.secondaryPerformance) / 2,
        0
      )
    );
  }

  private normalizeMonth(value: any) {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}$/.test(text)) {
      return text;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.slice(0, 7);
    }
    return '';
  }

  private normalizeYear(value: any) {
    const text = String(value || '').trim();
    if (/^\d{4}$/.test(text)) {
      return text;
    }
    if (/^\d{4}-\d{2}/.test(text)) {
      return text.slice(0, 4);
    }
    return '';
  }

  private getYearMonths(year: string) {
    return Array.from({ length: 12 }, (_, index) => {
      return `${year}-${String(index + 1).padStart(2, '0')}`;
    });
  }

  private emptyProfile() {
    return {
      mainRatio: 1,
      totalAmount: 0,
      mainAmount: 0,
      secondaryAmount: 0,
      items: [],
      oneTimeEligibleMainRatio: 1,
      secondaryRatio: 0,
      grossProfitAmount: 0,
      secondaryGrossProfitAmount: 0,
      secondaryCostAmount: 0,
      secondaryGrossProfitRatio: 0,
      grossProfitRatio: 0,
    };
  }

  private async getBonusAccountingMetrics(
    userId: number,
    roleType: string,
    month: string
  ) {
    const result = await this.calcUserMonth(
      userId,
      roleType,
      month,
      'expected'
    );
    const stages = (result.groups || [])
      .flatMap(group => (Array.isArray(group.stages) ? group.stages : []))
      .filter(stage => Number(stage.isContractOverdueDeduction || 0) !== 1);
    return {
      invoiceCount: stages.length,
      grossProfitAmount: this.toMoney(
        stages.reduce(
          (sum, item) => sum + this.toMoney(item.grossProfitAmount),
          0
        )
      ),
    };
  }

  private async calcAnnualAssessment(
    user: EligibleUser,
    year: string,
    withDetail: boolean
  ) {
    const ctx = await this.getBonusContext();
    const months = this.getYearMonths(year);
    const monthlyRows = await Promise.all(
      months.map(async month => {
        return await this.calcAnnualInvoiceMonth(user, month, ctx);
      })
    );
    const amountTotal = this.toMoney(
      monthlyRows.reduce((sum, item) => sum + this.toMoney(item.amountTotal), 0)
    );
    const monthlyBonusTotal = this.toMoney(
      monthlyRows.reduce((sum, item) => sum + this.toMoney(item.bonusTotal), 0)
    );
    const newCaseAmount = this.toMoney(
      monthlyRows.reduce((sum, item) => sum + this.toMoney(item.newCaseAmount), 0)
    );
    const renewalAmount = this.toMoney(
      monthlyRows.reduce((sum, item) => sum + this.toMoney(item.renewalAmount), 0)
    );
    const averageAmount = this.toMoney(amountTotal / 12);
    const renewalRate =
      amountTotal > 0 ? this.toMoney((renewalAmount / amountTotal) * 100) : 0;
    const salary = this.toMoney(user.withholdingSalary ?? user.salary);
    const rule =
      user.roleType === 'sales'
        ? this.resolveSalesAnnualRule(averageAmount, newCaseAmount, user, ctx)
        : await this.resolveInternalAnnualRule(
            user.id,
            averageAmount,
            renewalRate,
            ctx,
            year
          );
    const annualBonus = this.toMoney(salary * rule.annualFactor);
    const midYearBonus = this.toMoney(salary * rule.midYearFactor);

    return {
      year,
      userId: user.id,
      userName: user.name,
      roleType: user.roleType,
      phone: user.phone,
      email: user.email,
      salary,
      amountTotal,
      averageAmount,
      monthlyBonusTotal,
      newCaseAmount,
      renewalAmount,
      renewalRate,
      annualFactor: rule.annualFactor,
      midYearFactor: rule.midYearFactor,
      annualBonus,
      midYearBonus,
      bonusTotal: this.toMoney(annualBonus + midYearBonus),
      assessmentResult: rule.result,
      ruleRemark: rule.remark,
      isQualified: rule.annualFactor > 0 || rule.midYearFactor > 0 ? 1 : 0,
      months: withDetail ? monthlyRows : undefined,
    };
  }

  private async calcAnnualInvoiceMonth(
    user: EligibleUser,
    month: string,
    ctx: BonusContext
  ) {
    const result =
      user.roleType === 'internal'
        ? await this.calcInternalAnnualInvoiceMonth(user, month, ctx)
        : await this.calcSalesAnnualInvoiceMonth(user, month, ctx);
    const groups = Array.isArray(result.groups) ? result.groups : [];
    const newCaseAmount = this.toMoney(
      groups
        .filter(group => !this.isRenewalQuote(group.quoteType))
        .reduce((sum, group) => sum + this.toMoney(group.amountTotal), 0)
    );
    const renewalAmount = this.toMoney(
      groups
        .filter(group => this.isRenewalQuote(group.quoteType))
        .reduce((sum, group) => sum + this.toMoney(group.amountTotal), 0)
    );
    return {
      month,
      amountTotal: this.toMoney(result.amountTotal),
      bonusTotal: this.toMoney(result.bonusTotal),
      mainAmount: this.toMoney(result.mainAmount),
      secondaryAmount: this.toMoney(result.secondaryAmount),
      tierBonus: this.toMoney(result.tierBonus),
      newCaseAmount,
      renewalAmount,
      quoteCount: groups.length,
    };
  }

  private async calcSalesAnnualInvoiceMonth(
    user: EligibleUser,
    month: string,
    ctx: BonusContext
  ) {
    const range = this.getMonthRange(month);
    const rows = await this.fetchSalesAnnualInvoiceRows(user.id, range);
    const quoteIds: number[] = Array.from(
      new Set<number>(rows.map(item => Number(item.quoteOrderId)))
    );
    const itemMap = await this.getQuoteItemProfiles(quoteIds, ctx);
    const detailRows = rows.map(row => {
      const profile =
        itemMap.get(Number(row.quoteOrderId)) || this.emptyProfile();
      const sourceAmount = this.toMoney(row.sourceAmount);
      return {
        ...row,
        sourceAmount,
        bonusBaseAmount: sourceAmount,
        mainProductRatio: profile.mainRatio,
        secondaryProductRatio: profile.secondaryRatio,
        bonusAmount: 0,
        ...this.calcSalesStageMetrics(row, profile, sourceAmount, ctx),
      };
    });

    return this.buildAnnualInvoiceMonthResult(detailRows);
  }

  private async calcInternalAnnualInvoiceMonth(
    user: EligibleUser,
    month: string,
    ctx: BonusContext
  ) {
    const range = this.getMonthRange(month);
    const userEntity = await this.baseSysUserEntity.findOneBy({ id: user.id });
    const departmentType = await this.resolveInternalDepartmentType(userEntity);
    const rows = await this.fetchInternalAnnualInvoiceRows(user.id, range, ctx);
    const accountingRows = this.filterInternalRowsByDepartmentRule(
      rows,
      departmentType,
      ctx
    ).map(row => ({
      ...row,
      bonusAmount: 0,
    }));

    return this.buildAnnualInvoiceMonthResult(accountingRows);
  }

  private buildAnnualInvoiceMonthResult(rows: any[]) {
    const groups = this.groupDetailRows(rows);
    return {
      amountTotal: this.toMoney(
        rows.reduce((sum, item) => sum + this.toMoney(item.sourceAmount), 0)
      ),
      bonusTotal: 0,
      mainAmount: this.toMoney(
        rows.reduce((sum, item) => sum + this.toMoney(item.mainPerformance), 0)
      ),
      secondaryAmount: this.toMoney(
        rows.reduce(
          (sum, item) => sum + this.toMoney(item.secondaryPerformance),
          0
        )
      ),
      tierBonus: 0,
      groups,
    };
  }

  private async fetchSalesAnnualInvoiceRows(
    userId: number,
    range: { start: string; end: string }
  ) {
    return await this.nativeQuery(
      `
      SELECT
        i.id AS invoiceId,
        i.quoteOrderId,
        i.quoteStageId AS stageId,
        i.stageNo,
        i.stageName,
        i.ratio,
        i.amount AS sourceAmount,
        i.auditTime,
        q.quoteNo,
        q.quoteName,
        q.quoteType
      FROM crm_quote_invoice i
      INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId
      WHERE i.isDeleted = 0
        AND i.status = 2
        AND IFNULL(i.ecpayInvalidStatus, 0) <> 2
        AND i.voidTime IS NULL
        AND i.auditTime IS NOT NULL
        AND i.auditTime <> ''
        AND i.auditTime >= ?
        AND i.auditTime <= ?
        AND q.isDeleted = 0
        AND q.salesmanId = ?
      ORDER BY i.auditTime ASC, i.id ASC
      `,
      [range.start, range.end, userId]
    );
  }

  private async fetchInternalAnnualInvoiceRows(
    userId: number,
    range: { start: string; end: string },
    ctx: BonusContext
  ) {
    const rows = await this.nativeQuery(
      `
      SELECT
        i.id AS invoiceId,
        i.quoteOrderId,
        qi.id AS itemId,
        qi.sortNum AS stageNo,
        qi.productName,
        qi.specName,
        qi.subtotalAmount,
        qi.grossProfitAmount,
        qi.departmentId,
        q.quoteNo,
        q.quoteName,
        q.quoteType,
        i.auditTime,
        i.amount AS invoiceAmount,
        qt.totalAmount AS quoteItemAmount
      FROM crm_quote_invoice i
      INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId
      INNER JOIN crm_quote_order_item qi ON qi.quoteOrderId = q.id
      INNER JOIN base_sys_user u ON u.id = ?
      INNER JOIN crm_quote_order_department_audit da
        ON da.quoteOrderId = q.id
       AND da.departmentId = qi.departmentId
       AND da.isDeleted = 0
       AND da.auditStatus = 2
      LEFT JOIN (
        SELECT quoteOrderId, COALESCE(SUM(subtotalAmount), 0) AS totalAmount
        FROM crm_quote_order_item
        WHERE isDeleted = 0
        GROUP BY quoteOrderId
      ) qt ON qt.quoteOrderId = q.id
      WHERE i.isDeleted = 0
        AND i.status = 2
        AND IFNULL(i.ecpayInvalidStatus, 0) <> 2
        AND i.voidTime IS NULL
        AND i.auditTime IS NOT NULL
        AND i.auditTime <> ''
        AND i.auditTime >= ?
        AND i.auditTime <= ?
        AND qi.isDeleted = 0
        AND q.isDeleted = 0
        AND da.assignStatus = 2
        AND da.costStatus = 1
        AND da.assigneeId = ?
        AND da.costUserId = ?
        AND qi.departmentId = u.departmentId
      ORDER BY i.auditTime ASC, i.id ASC, qi.sortNum ASC, qi.id ASC
      `,
      [userId, range.start, range.end, userId, userId]
    );

    return rows.map(row => {
      const totalAmount = this.toMoney(row.quoteItemAmount);
      const itemAmount = this.toMoney(row.subtotalAmount);
      const itemRatio = totalAmount > 0 ? itemAmount / totalAmount : 0;
      const sourceAmount = this.toMoney(this.toMoney(row.invoiceAmount) * itemRatio);
      const grossRate =
        itemAmount > 0
          ? (this.toMoney(row.grossProfitAmount) / itemAmount) * 100
          : 0;
      const isMain = grossRate >= ctx.mainMarginThreshold;
      const grossProfitAmount = this.toMoney(
        this.toMoney(row.grossProfitAmount) * itemRatio
      );
      return {
        stageId: `${row.invoiceId}-${row.itemId}`,
        quoteOrderId: row.quoteOrderId,
        stageNo: row.stageNo,
        stageName: `${row.productName || ''}${
          row.specName ? ` / ${row.specName}` : ''
        }`,
        ratio: itemRatio,
        amount: sourceAmount,
        sourceAmount,
        grossProfitAmount,
        invoiceDate: row.auditTime,
        receiptTime: row.auditTime,
        receiptAmount: sourceAmount,
        receiptVoucher: '',
        quoteNo: row.quoteNo,
        quoteName: row.quoteName,
        quoteType: row.quoteType,
        grossRate,
        mainProductRatio: isMain ? 1 : 0,
        secondaryProductRatio: isMain ? 0 : 1,
        mainPerformance: isMain ? sourceAmount : 0,
        secondaryPerformance: isMain ? 0 : sourceAmount,
        secondaryGrossProfit: isMain ? 0 : grossProfitAmount,
        isOneTimePayment: 0,
      };
    });
  }

  private resolveSalesAnnualRule(
    averageAmount: number,
    newCaseAmount: number,
    user: EligibleUser,
    ctx: BonusContext
  ) {
    const lowAvg = this.configValue(ctx.config, 'sales_year_low_avg', 800000);
    const targetAvg = this.configValue(
      ctx.config,
      'sales_year_target_avg',
      1000000
    );
    const overAvg = this.configValue(ctx.config, 'sales_year_over_avg', 1200000);
    const newCaseThreshold = this.configValue(
      ctx.config,
      'sales_new_case_year_threshold',
      2400000
    );
    const rule = this.resolveAnnualThresholdRule(
      averageAmount,
      lowAvg,
      targetAvg,
      overAvg
    );
    const isProbation = this.isProbationUser(user);
    const shouldHalfByNewCase =
      rule.annualFactor > 0 &&
      !isProbation &&
      newCaseAmount <= newCaseThreshold;
    if (shouldHalfByNewCase) {
      rule.annualFactor = this.toMoney(rule.annualFactor / 2);
      rule.remark = `${rule.remark}；新案年度金額未超過 ${newCaseThreshold}，年終獎金減半`;
    } else if (isProbation) {
      rule.remark = `${rule.remark}；試用期不受新案年度金額限制`;
    }
    return rule;
  }

  private async resolveInternalAnnualRule(
    userId: number,
    averageAmount: number,
    renewalRate: number,
    ctx: BonusContext,
    year?: string,
    skipDoubleWin = false
  ) {
    const isManager = await this.isInternalManager(userId);
    const lowAvg = this.configValue(
      ctx.config,
      isManager ? 'internal_manager_year_low_avg' : 'internal_staff_year_low_avg',
      isManager ? 400000 : 600000
    );
    const targetAvg = this.configValue(
      ctx.config,
      isManager
        ? 'internal_manager_year_target_avg'
        : 'internal_staff_year_target_avg',
      isManager ? 600000 : 800000
    );
    const overAvg = this.configValue(
      ctx.config,
      isManager
        ? 'internal_manager_year_over_avg'
        : 'internal_staff_year_over_avg',
      isManager ? 800000 : 1000000
    );
    const renewalThreshold = this.configValue(
      ctx.config,
      'internal_renewal_rate_threshold',
      50
    );
    const rule = this.resolveAnnualThresholdRule(
      averageAmount,
      lowAvg,
      targetAvg,
      overAvg
    );
    if (rule.annualFactor > 0 && renewalRate < renewalThreshold) {
      rule.annualFactor = this.toMoney(rule.annualFactor / 2);
      rule.remark = `${rule.remark}；年度續約率未達 ${renewalThreshold}%，年終獎金按 50% 核發`;
    } else if (rule.annualFactor > 0) {
      rule.remark = `${rule.remark}；年度續約率達標`;
    }
    // 主管雙贏加碼：團隊全員年終達滿額，主管額外加碼年中半個月
    if (!skipDoubleWin && isManager && year && rule.annualFactor >= 1) {
      const allFull = await this.checkTeamAllFullBonus(userId, year, ctx);
      if (allFull) {
        rule.midYearFactor = this.toMoney(rule.midYearFactor + 0.5);
        rule.result = rule.result ? `${rule.result} + 雙贏加碼` : '雙贏加碼';
        rule.remark = `${rule.remark}；團隊全員年終達滿額，主管雙贏加碼年中半個月`;
      }
    }
    return rule;
  }

  private async checkTeamAllFullBonus(
    managerId: number,
    year: string,
    ctx: BonusContext
  ): Promise<boolean> {
    const members = await this.nativeQuery(
      `
      SELECT u.id, u.name
      FROM base_sys_user u
      INNER JOIN base_sys_user_role ur ON ur.userId = u.id
      INNER JOIN base_sys_role r ON r.id = ur.roleId
      WHERE u.status = 1
        AND r.label = ?
        AND u.departmentId = (SELECT departmentId FROM base_sys_user WHERE id = ?)
      GROUP BY u.id
      `,
      [this.INTERNAL_ROLE_LABEL, managerId]
    );
    if (!members || members.length === 0) return false;
    const months = this.getYearMonths(year);
    for (const member of members) {
      const memberUser: EligibleUser = {
        id: Number(member.id),
        name: String(member.name || ''),
        roleType: 'internal',
      };
      const monthlyRows = await Promise.all(
        months.map(async month => {
          return await this.calcAnnualInvoiceMonth(memberUser, month, ctx);
        })
      );
      const amountTotal = this.toMoney(
        monthlyRows.reduce((sum, r) => sum + r.amountTotal, 0)
      );
      const renewalAmount = this.toMoney(
        monthlyRows.reduce((sum, r) => sum + r.renewalAmount, 0)
      );
      const averageAmount = this.toMoney(amountTotal / 12);
      const renewalRate =
        amountTotal > 0 ? this.toMoney((renewalAmount / amountTotal) * 100) : 0;
      const memberRule = await this.resolveInternalAnnualRule(
        member.id,
        averageAmount,
        renewalRate,
        ctx,
        year,
        true
      );
      if (memberRule.annualFactor < 1) return false;
    }
    return true;
  }

  private resolveAnnualThresholdRule(
    averageAmount: number,
    lowAvg: number,
    targetAvg: number,
    overAvg: number
  ) {
    if (averageAmount >= overAvg) {
      return {
        annualFactor: 1,
        midYearFactor: 0.5,
        result: '全額年終 + 年中半個月',
        remark: `月均業績達到 ${overAvg}`,
      };
    }
    if (averageAmount >= targetAvg) {
      return {
        annualFactor: 1,
        midYearFactor: 0,
        result: '全額年終',
        remark: `月均業績達到 ${targetAvg}`,
      };
    }
    if (averageAmount >= lowAvg) {
      return {
        annualFactor: 0.5,
        midYearFactor: 0,
        result: '半額年終',
        remark: `月均業績達到 ${lowAvg}`,
      };
    }
    return {
      annualFactor: 0,
      midYearFactor: 0,
      result: '未達標',
      remark: `月均業績未達到 ${lowAvg}`,
    };
  }

  private getItemGrossRate(
    item: Pick<CrmQuoteOrderItemEntity, 'subtotalAmount' | 'grossProfitAmount'>
  ) {
    const amount = this.toMoney(item.subtotalAmount);
    if (amount <= 0) {
      return 0;
    }
    return (this.toMoney(item.grossProfitAmount) / amount) * 100;
  }

  private isMainQuoteItem(item: Pick<CrmQuoteOrderItemEntity, 'productType'>) {
    return Number(item?.productType || 1) === 1;
  }

  private isOneTimeAddExcludedCategory(item: any) {
    const categoryName = String(item?.categoryName || item?.productName || '');
    return /網紅|網紅|廣告|廣告/i.test(categoryName);
  }

  private isRenewalQuote(quoteType: any) {
    const text = String(quoteType ?? '').trim();
    return text === '2' || text.includes('續約') || text.includes('續約');
  }

  private isProbationUser(user: EligibleUser) {
    const text = `${user.level || ''} ${user.remark || ''}`.toLowerCase();
    return (
      text.includes('試用') ||
      text.includes('試用') ||
      text.includes('probation')
    );
  }

  private parseDutyRate(value: any) {
    const raw =
      typeof value === 'object' && value !== null
        ? value.value ?? value.data ?? value.val ?? value.content ?? ''
        : value;
    const number = Number(String(raw || '').replace('%', ''));
    if (!Number.isFinite(number) || number <= 0) {
      return 0;
    }
    return number > 1 ? number / 100 : number;
  }

  private toUntaxedAmount(amount: any, dutyRate: number) {
    const value = this.toMoney(amount);
    if (value <= 0 || dutyRate <= 0) {
      return value;
    }
    return this.toMoney(value / (1 + dutyRate));
  }

  private getProjectMonthCount(startDate: string, endDate: string) {
    const start = moment(startDate).startOf('month');
    const end = moment(endDate).startOf('month');
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      return 1;
    }
    return Math.max(1, end.diff(start, 'months') + 1);
  }

  private configValue(
    config: Map<string, number>,
    key: string,
    fallback: number
  ) {
    const value = config.get(key);
    return value === undefined || Number.isNaN(value) ? fallback : value;
  }

  private toNumber(value: any) {
    const num = Number(value ?? 0);
    return Number.isNaN(num) ? 0 : num;
  }

  private toMoney(value: any) {
    return Number(this.toNumber(value).toFixed(2));
  }

  private toProductRatio(amount: any, totalAmount: any) {
    const total = this.toMoney(totalAmount);
    if (total <= 0) {
      return 0;
    }
    return Number(((this.toMoney(amount) / total) * 100).toFixed(4)) / 100;
  }

  private percent(value: any) {
    return `${Number((this.toNumber(value) * 100).toFixed(2)).toString()}%`;
  }

  private growth(current: any, previous: any) {
    const currentValue = this.toNumber(current);
    const previousValue = this.toNumber(previous);
    if (previousValue <= 0) {
      return currentValue > 0 ? '100%' : '0%';
    }
    return `${Number(
      (((currentValue - previousValue) / previousValue) * 100).toFixed(2)
    ).toString()}%`;
  }

  private fillMonthly(months: number[], rows: any[]) {
    const map = new Map<number, number>();
    (rows || []).forEach(row => {
      map.set(Number(row.month || 0), this.toMoney(row.amount));
    });
    return months.map(month => map.get(month) || 0);
  }

  private fillYoy(months: number[], currentRows: any[], previousRows: any[]) {
    const current = new Map<number, number>();
    const previous = new Map<number, number>();
    (currentRows || []).forEach(row => {
      current.set(Number(row.month || 0), this.toMoney(row.amount));
    });
    (previousRows || []).forEach(row => {
      previous.set(Number(row.month || 0), this.toMoney(row.amount));
    });
    return months.map(month => {
      const currentValue = current.get(month) || 0;
      const previousValue = previous.get(month) || 0;
      if (previousValue <= 0) {
        return currentValue > 0 ? 100 : 0;
      }
      return this.toMoney(((currentValue - previousValue) / previousValue) * 100);
    });
  }

  private normalizePieRows(rows: any[]) {
    const result = (rows || [])
      .map(row => ({
        name: String(row.name || '未填寫'),
        value: this.toMoney(row.value),
      }))
      .filter(row => row.value > 0);
    return result.length ? result : [{ name: '暫無資料', value: 0 }];
  }

  private monthAmountRecord(months: number[], monthMap: Map<number, number>) {
    return months.reduce((record, month) => {
      record[`${month}月`] = monthMap.get(month) || 0;
      return record;
    }, {} as Record<string, number>);
  }

  private toYoyText(current: number, previous: number) {
    const diff = this.toMoney(current - previous);
    const rate =
      previous > 0
        ? this.toMoney((diff / previous) * 100)
        : current > 0
          ? 100
          : 0;
    return {
      diff,
      rate,
    };
  }

  private getProjectPeriodLabel(row: any) {
    const start = row?.startDate ? moment(String(row.startDate).slice(0, 10)) : null;
    const end = row?.endDate ? moment(String(row.endDate).slice(0, 10)) : null;
    if (start?.isValid() && end?.isValid()) {
      const months = Math.max(1, end.diff(start, 'months') + 1);
      if (months <= 1) return '單月';
      if (months <= 3) return '季度';
      if (months >= 12) return '年度';
      return `${months}個月`;
    }
    return Number(row?.quoteType) === 2 ? '續約' : '新案';
  }
}
