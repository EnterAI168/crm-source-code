import { Inject, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Context } from '@midwayjs/koa';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { In, Repository } from 'typeorm';
import * as moment from 'moment';
import { BaseSysPermsService } from '../../base/service/sys/perms';
import { BaseSysDepartmentEntity } from '../../base/entity/sys/department';
import { BaseSysRoleEntity } from '../../base/entity/sys/role';
import { BaseSysUserEntity } from '../../base/entity/sys/user';
import { CrmRemittanceEntity } from '../entity/remittance';
import { CrmRemittanceStageEntity } from '../entity/remittanceStage';
import { CrmQuoteOrderEntity } from '../entity/quoteOrder';
import { CrmSupplierInfoEntity } from '../../supplier/entity/info';

interface QuoteOptionScope {
  userId: number;
  departmentIds: number[];
  departmentUserIds: number[];
  isBoss: boolean;
  isFinance: boolean;
  isOfficeClerkManager: boolean;
  isOfficeClerk: boolean;
}

@Provide()
export class CrmRemittanceService extends BaseService {
  private readonly SUPER_ROLE_LABELS = ['admin', 'boss'];

  private readonly FINANCE_ROLE_LABELS = ['finance', 'financial', 'accountant'];

  private readonly FINANCE_ROLE_NAMES = ['財務', '財務', 'finance', 'financial', 'accountant'];

  private readonly INTERNAL_ROLE_LABEL = 'office_clerk';

  private readonly INTERNAL_MANAGER_ROLE_LABEL = 'office_clerk_manager';

  @InjectEntityModel(CrmRemittanceEntity)
  crmRemittanceEntity: Repository<CrmRemittanceEntity>;

  @InjectEntityModel(CrmRemittanceStageEntity)
  crmRemittanceStageEntity: Repository<CrmRemittanceStageEntity>;

  @InjectEntityModel(CrmQuoteOrderEntity)
  crmQuoteOrderEntity: Repository<CrmQuoteOrderEntity>;

  @InjectEntityModel(CrmSupplierInfoEntity)
  crmSupplierEntity: Repository<CrmSupplierInfoEntity>;

  @InjectEntityModel(BaseSysUserEntity)
  baseSysUserEntity: Repository<BaseSysUserEntity>;

  @InjectEntityModel(BaseSysRoleEntity)
  baseSysRoleEntity: Repository<BaseSysRoleEntity>;

  @InjectEntityModel(BaseSysDepartmentEntity)
  baseSysDepartmentEntity: Repository<BaseSysDepartmentEntity>;

  @Inject()
  ctx: Context;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  async page(query: any) {
    const { remittanceName, status, supplierEmail } = query || {};
    const scope = await this.getQuoteOptionScope();
    const restrictSql = this.buildQuoteScopeSql(scope, 'q');

    const sql = `
      SELECT
        a.*,
        q.quoteNo AS quoteOrderNo,
        q.quoteName AS quoteOrderName,
        u.name AS salesmanName,
        cs.stageOrder AS currentStageOrder,
        cs.ratio AS currentStageRatio,
        cs.amount AS currentStageAmount,
        GREATEST(a.totalAmount - IFNULL(a.paidAmount, 0), 0) AS currentStageRemainingAmount,
        cs.expectedRemittanceTime AS currentExpectedRemittanceTime,
        cs.actualRemittanceTime AS currentActualRemittanceTime,
        cs.nextStageRemittanceTime AS currentNextStageRemittanceTime
      FROM crm_remittance a
      LEFT JOIN crm_quote_order q ON q.id = a.quoteOrderId
      LEFT JOIN base_sys_user u ON u.id = a.salesmanId
      LEFT JOIN crm_remittance_stage cs ON cs.id = (
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM crm_remittance_stage sx
            WHERE sx.remittanceId = a.id
              AND sx.paymentStatus = 0
          ) THEN (
            SELECT sx.id
            FROM crm_remittance_stage sx
            WHERE sx.remittanceId = a.id
              AND sx.paymentStatus = 0
            ORDER BY sx.stageOrder ASC, sx.id ASC
            LIMIT 1
          )
          ELSE (
            SELECT sx.id
            FROM crm_remittance_stage sx
            WHERE sx.remittanceId = a.id
            ORDER BY sx.stageOrder DESC, sx.id DESC
            LIMIT 1
          )
        END
      )
      WHERE a.isDeleted = 0
        ${this.setSql(remittanceName, 'and a.remittanceName like ?', [`%${remittanceName}%`])}
        ${this.setSql(status, 'and a.status = ?', [Number(status)])}
        ${this.setSql(supplierEmail, 'and a.supplierEmail like ?', [`%${supplierEmail}%`])}
        ${restrictSql}
      ORDER BY a.createTime DESC
    `;

    return await this.sqlRenderPage(sql, query, false);
  }

  async info(id: number | string) {
    const remittance = await this.getRemittanceById(Number(id));
    const detail = await this.fetchRemittanceDetail(remittance.id);

    const stages = await this.crmRemittanceStageEntity.find({
      where: { remittanceId: remittance.id },
      order: { stageOrder: 'ASC', id: 'ASC' },
    });

    return {
      ...detail,
      stages,
    };
  }

  async add(param: any) {
    const remittanceName = String(param?.remittanceName || '').trim();
    if (!remittanceName) {
      throw new CoolCommException('匯款專案名稱不能為空');
    }

    const totalAmount = this.toMoney(param?.totalAmount);
    if (totalAmount <= 0) {
      throw new CoolCommException('匯款總價必須大於0');
    }

    const quoteOrderId = this.toNullableNumber(param?.quoteOrderId);
    if (!quoteOrderId) {
      throw new CoolCommException('關聯報價單不能為空');
    }
    let quoteOrder = null;
    quoteOrder = await this.crmQuoteOrderEntity.findOneBy({
      id: quoteOrderId,
      isDeleted: 0,
    });
    if (!quoteOrder) {
      throw new CoolCommException('關聯的報價單不存在');
    }
    await this.assertQuoteOrderAccess(quoteOrderId);

    const supplierId = this.toNullableNumber(param?.supplierId);
    let supplier = null;
    if (supplierId) {
      supplier = await this.crmSupplierEntity.findOneBy({
        id: supplierId,
        isDeleted: 0,
      });
      if (!supplier) {
        throw new CoolCommException('供應商不存在');
      }
    }

    const remittanceNo = await this.resolveCreateRemittanceNo(param?.remittanceNo);
    const stages = this.normalizeStages(param?.stages || [], totalAmount);
    const salesmanId = quoteOrder?.salesmanId || this.ctx.admin?.userId || null;

    const saved = await this.crmRemittanceEntity.save({
      remittanceNo,
      remittanceName,
      quoteOrderId,
      remittanceType: String(param?.remittanceType || '').trim() || null,
      supplierId,
      supplierCompanyName: supplier?.companyName || String(param?.supplierCompanyName || '').trim() || null,
      supplierAddress: supplier?.address || String(param?.supplierAddress || '').trim() || null,
      supplierUnifiedNo: supplier?.unifiedNo || String(param?.supplierUnifiedNo || '').trim() || null,
      supplierEmail: supplier?.email || String(param?.supplierEmail || '').trim() || null,
      totalAmount,
      paidAmount: 0,
      status: 1,
      salesmanId,
      remark: String(param?.remark || '').trim() || null,
      isDeleted: 0,
    });

    await this.saveStages(saved.id, stages);

    return {
      id: saved.id,
      remittanceNo: saved.remittanceNo,
    };
  }

  async update(param: any) {
    const id = Number(param?.id || 0);
    const oldRow = await this.getRemittanceById(id);

    if (Number(oldRow.status) === 2) {
      throw new CoolCommException('已完成的匯款單不允許編輯');
    }

    const remittanceName = String(param?.remittanceName || '').trim();
    if (!remittanceName) {
      throw new CoolCommException('匯款專案名稱不能為空');
    }

    const totalAmount = this.toMoney(param?.totalAmount);
    if (totalAmount <= 0) {
      throw new CoolCommException('匯款總價必須大於0');
    }

    const quoteOrderId = this.toNullableNumber(param?.quoteOrderId);
    if (!quoteOrderId) {
      throw new CoolCommException('關聯報價單不能為空');
    }
    let quoteOrder = null;
    quoteOrder = await this.crmQuoteOrderEntity.findOneBy({
      id: quoteOrderId,
      isDeleted: 0,
    });
    if (!quoteOrder) {
      throw new CoolCommException('關聯的報價單不存在');
    }
    await this.assertQuoteOrderAccess(quoteOrderId);

    const supplierId = this.toNullableNumber(param?.supplierId);
    let supplier = null;
    if (supplierId) {
      supplier = await this.crmSupplierEntity.findOneBy({
        id: supplierId,
        isDeleted: 0,
      });
      if (!supplier) {
        throw new CoolCommException('供應商不存在');
      }
    }

    const stages = await this.normalizeStagesForUpdate(param?.stages || [], totalAmount, oldRow.id);
    const salesmanId = quoteOrder?.salesmanId || oldRow.salesmanId || this.ctx.admin?.userId || null;

    await this.crmRemittanceEntity.update(
      { id: oldRow.id },
      {
        remittanceName,
        quoteOrderId,
        remittanceType: String(param?.remittanceType || '').trim() || null,
        supplierId,
        supplierCompanyName: supplier?.companyName || String(param?.supplierCompanyName || '').trim() || null,
        supplierAddress: supplier?.address || String(param?.supplierAddress || '').trim() || null,
        supplierUnifiedNo: supplier?.unifiedNo || String(param?.supplierUnifiedNo || '').trim() || null,
        supplierEmail: supplier?.email || String(param?.supplierEmail || '').trim() || null,
        totalAmount,
        salesmanId,
        remark: String(param?.remark || '').trim() || null,
      }
    );

    await this.replaceStages(oldRow.id, stages);
    await this.refreshRemittanceStatus(oldRow.id);
  }

  async delete(ids: number[] | number) {
    const idArr = this.toIdArray(ids);
    if (idArr.length === 0) {
      return;
    }

    const rows = await this.crmRemittanceEntity.findBy({
      id: In(idArr),
      isDeleted: 0,
    });

    const allowedIds = rows
      .filter(row => Number(row.status) !== 2)
      .map(row => row.id);

    if (allowedIds.length === 0) {
      throw new CoolCommException('已完成的匯款單不允許刪除');
    }

    await this.crmRemittanceEntity.update(
      { id: In(allowedIds) },
      { isDeleted: 1 }
    );
    await this.crmRemittanceStageEntity.delete({
      remittanceId: In(allowedIds)
    });
  }

  async remittanceStages(param: any) {
    const remittance = await this.getRemittanceById(Number(param?.id || 0));

    const stages = await this.crmRemittanceStageEntity.find({
      where: { remittanceId: remittance.id },
      order: { stageOrder: 'ASC', id: 'ASC' },
    });

    return {
      id: remittance.id,
      remittanceNo: remittance.remittanceNo,
      remittanceName: remittance.remittanceName,
      stages: stages.filter(item => Number(item.paymentStatus) === 0),
    };
  }

  async submitRemittance(param: any) {
    const remittance = await this.getRemittanceById(Number(param?.id || 0));

    const stageId = Number(param?.stageId || 0);
    if (!stageId) {
      throw new CoolCommException('缺少匯款階段');
    }

    const stage = await this.crmRemittanceStageEntity.findOneBy({
      id: stageId,
      remittanceId: remittance.id,
    });
    if (!stage) {
      throw new CoolCommException('匯款階段不存在');
    }

    if (Number(stage.paymentStatus) === 1) {
      throw new CoolCommException('該階段已完成匯款');
    }

    const paidAmount = this.toMoney(param?.paidAmount);
    if (paidAmount <= 0) {
      throw new CoolCommException('匯款金額必須大於0');
    }
    if (paidAmount > this.toMoney(stage.amount)) {
      throw new CoolCommException('匯款金額不能大於應匯款金額');
    }

    const voucherFile = String(param?.voucherFile || '').trim() || null;
    const actualRemittanceTime = this.normalizeDateTime(param?.actualRemittanceTime) || this.now();
    const nextStageRemittanceTime = this.normalizeDateTime(param?.nextStageRemittanceTime);

    await this.crmRemittanceStageEntity.update(
      { id: stage.id },
      {
        paidAmount,
        voucherFile,
        actualRemittanceTime,
        nextStageRemittanceTime,
        paymentStatus: 1,
        paymentUserId: this.ctx.admin?.userId || null,
        paymentTime: this.now(),
      }
    );

    await this.refreshRemittanceStatus(remittance.id);

    return {
      id: remittance.id,
      stageId: stage.id,
      paidAmount,
    };
  }

  async quoteOrderOptions() {
    const scope = await this.getQuoteOptionScope();
    const restrict = this.buildQuoteOptionScopeCondition(scope);
    const sql = `
      SELECT
        a.id,
        a.quoteNo,
        a.quoteName,
        a.salesmanId,
        u.name AS salesmanName
      FROM crm_quote_order a
      LEFT JOIN base_sys_user u ON u.id = a.salesmanId
      WHERE a.isDeleted = 0
        ${restrict.sql}
      ORDER BY a.createTime DESC
    `;

    return await this.nativeQuery(sql, restrict.params);
  }

  async supplierOptions() {
    const suppliers = await this.crmSupplierEntity.find({
      where: { isDeleted: 0, status: 1 },
      order: { createTime: 'DESC', id: 'DESC' },
    });

    return suppliers;
  }

  async nextNo() {
    return await this.generateRemittanceNo();
  }

  private async getRemittanceById(id: number) {
    if (!id) {
      throw new CoolCommException('匯款單不存在');
    }

    const row = await this.crmRemittanceEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('匯款單不存在');
    }
    await this.assertRemittanceAccess(row.id);

    return row;
  }

  private async fetchRemittanceDetail(id: number) {
    const rows = await this.nativeQuery(
      `
      SELECT
        a.*,
        q.quoteName AS quoteOrderName,
        q.quoteNo AS quoteOrderNo,
        u.name AS salesmanName
      FROM crm_remittance a
      LEFT JOIN crm_quote_order q ON q.id = a.quoteOrderId
      LEFT JOIN base_sys_user u ON u.id = a.salesmanId
      WHERE a.id = ? AND a.isDeleted = 0
      LIMIT 1
      `,
      [id]
    );
    return rows?.[0] || null;
  }

  private normalizeStages(stages: any[], totalAmount: number) {
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new CoolCommException('匯款階段不能為空');
    }

    const normalized = stages.map((item, index) => {
      const ratio = this.normalizeRate(item?.ratio);
      const amount = ratio > 0 && totalAmount > 0 ? this.toMoney(totalAmount * ratio) : this.toMoney(item?.amount);

      return {
        stageOrder: index + 1,
        stageName: String(item?.stageName || `階段${index + 1}`).trim(),
        ratio: this.toNumber(ratio),
        amount: this.toMoney(amount),
        expectedRemittanceTime: this.normalizeDateTime(item?.expectedRemittanceTime),
        actualRemittanceTime: null,
        nextStageRemittanceTime: this.normalizeDateTime(item?.nextStageRemittanceTime),
        paidAmount: 0,
        voucherFile: null,
        paymentStatus: 0,
        paymentUserId: null,
        paymentTime: null,
        remark: String(item?.remark || '').trim() || null,
      };
    });

    this.validateStageRatios(normalized);

    return normalized;
  }

  private async normalizeStagesForUpdate(stages: any[], totalAmount: number, remittanceId: number) {
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new CoolCommException('匯款階段不能為空');
    }

    const existingStages = await this.crmRemittanceStageEntity.find({
      where: { remittanceId },
      order: { stageOrder: 'ASC', id: 'ASC' },
    });

    const paidStageIds = new Set(
      existingStages
        .filter(item => Number(item.paymentStatus) === 1)
        .map(item => item.id)
    );

    const incomingStageIds = new Set(
      stages
        .map(item => Number(item?.id || 0))
        .filter(item => item > 0)
    );

    if ([...paidStageIds].some(id => !incomingStageIds.has(id))) {
      throw new CoolCommException('已匯款階段不允許刪除');
    }

    const normalized = stages.map((item, index) => {
      const stageId = Number(item?.id || 0);
      const isPaid = paidStageIds.has(stageId);

      if (isPaid) {
        const existing = existingStages.find(s => s.id === stageId);
        return {
          id: stageId,
          stageOrder: index + 1,
          stageName: existing?.stageName || String(item?.stageName || `階段${index + 1}`).trim(),
          ratio: existing?.ratio || 0,
          amount: existing?.amount || 0,
          expectedRemittanceTime: existing?.expectedRemittanceTime || null,
          actualRemittanceTime: existing?.actualRemittanceTime || null,
          nextStageRemittanceTime: existing?.nextStageRemittanceTime || null,
          paidAmount: existing?.paidAmount || 0,
          voucherFile: existing?.voucherFile || null,
          paymentStatus: existing?.paymentStatus || 0,
          paymentUserId: existing?.paymentUserId || null,
          paymentTime: existing?.paymentTime || null,
          remark: existing?.remark || null,
        };
      }

      const ratio = this.normalizeRate(item?.ratio);
      const amount = ratio > 0 && totalAmount > 0 ? this.toMoney(totalAmount * ratio) : this.toMoney(item?.amount);

      return {
        id: stageId > 0 ? stageId : undefined,
        stageOrder: index + 1,
        stageName: String(item?.stageName || `階段${index + 1}`).trim(),
        ratio: this.toNumber(ratio),
        amount: this.toMoney(amount),
        expectedRemittanceTime: this.normalizeDateTime(item?.expectedRemittanceTime),
        actualRemittanceTime: null,
        nextStageRemittanceTime: this.normalizeDateTime(item?.nextStageRemittanceTime),
        paidAmount: 0,
        voucherFile: null,
        paymentStatus: 0,
        paymentUserId: null,
        paymentTime: null,
        remark: String(item?.remark || '').trim() || null,
      };
    });

    this.validateStageRatios(normalized, true);

    return normalized;
  }

  private async saveStages(remittanceId: number, stages: any[]) {
    if (!remittanceId || stages.length === 0) {
      return;
    }
    await this.crmRemittanceStageEntity.save(
      stages.map(item => ({
        ...item,
        remittanceId,
      }))
    );
  }

  private async replaceStages(remittanceId: number, stages: any[]) {
    const existingStages = await this.crmRemittanceStageEntity.find({
      where: { remittanceId },
    });

    const stageIdsToKeep = new Set(
      stages.filter(s => s.id).map(s => s.id)
    );

    const stagesToDelete = existingStages
      .filter(s => !stageIdsToKeep.has(s.id))
      .map(s => s.id);

    if (stagesToDelete.length > 0) {
      await this.crmRemittanceStageEntity.delete(stagesToDelete);
    }

    await this.crmRemittanceStageEntity.save(
      stages.map(item => ({
        ...item,
        remittanceId,
      }))
    );
  }

  private async refreshRemittanceStatus(remittanceId: number) {
    const stages = await this.crmRemittanceStageEntity.find({
      where: { remittanceId },
      order: { stageOrder: 'ASC', id: 'ASC' },
    });

    const totalPaid = stages.reduce(
      (sum, item) => sum + this.toMoney(item.paidAmount),
      0
    );

    const allPaid = stages.every(item => Number(item.paymentStatus) === 1);

    await this.crmRemittanceEntity.update(
      { id: remittanceId },
      {
        paidAmount: this.toMoney(totalPaid),
        status: allPaid ? 2 : 1,
      }
    );
  }

  private async generateRemittanceNo() {
    for (let i = 0; i < 10; i++) {
      const remittanceNo = `R${moment().format('YYYYMMDDHHmmss')}${this.randomDigits(6)}`;
      const rows = await this.nativeQuery(
        'SELECT COUNT(1) AS count FROM crm_remittance WHERE remittanceNo = ?',
        [remittanceNo]
      );
      if (Number(rows?.[0]?.count || 0) === 0) {
        return remittanceNo;
      }
    }
    throw new CoolCommException('匯款單編號生成失敗，請重試');
  }

  private async resolveCreateRemittanceNo(value: any) {
    const remittanceNo = String(value || '').trim();
    if (!remittanceNo) {
      return await this.generateRemittanceNo();
    }

    const rows = await this.nativeQuery(
      'SELECT COUNT(1) AS count FROM crm_remittance WHERE remittanceNo = ?',
      [remittanceNo]
    );
    if (Number(rows?.[0]?.count || 0) > 0) {
      throw new CoolCommException('匯款單編號已存在');
    }

    return remittanceNo;
  }

  private toIdArray(ids: number[] | number) {
    if (Array.isArray(ids)) {
      return ids
        .map(item => Number(item))
        .filter(item => !Number.isNaN(item) && item > 0);
    }
    const id = Number(ids);
    return !Number.isNaN(id) && id > 0 ? [id] : [];
  }

  private toNumber(value: any) {
    const n = Number(value ?? 0);
    return Number.isNaN(n) ? 0 : n;
  }

  private toMoney(value: any) {
    return Number(this.toNumber(value).toFixed(2));
  }

  private normalizeRate(value: any) {
    const ratio = this.toNumber(value);
    if (ratio > 1) {
      return this.toNumber(ratio / 100);
    }
    return ratio;
  }

  private validateStageRatios(stages: any[], isUpdate = false) {
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new CoolCommException('匯款階段不能為空');
    }

    if (stages.some(item => this.toNumber(item?.ratio) <= 0)) {
      throw new CoolCommException('匯款比例必須大於0');
    }

    const totalRatio = stages.reduce(
      (sum, item) => sum + this.toNumber(item?.ratio),
      0
    );

    if (Math.abs(totalRatio - 1) > 0.0001) {
      throw new CoolCommException(
        isUpdate ? '修改未付款的比例必須加上已匯款的比例等於100%' : '匯款比例累加必須等於100%'
      );
    }
  }

  private toNullableNumber(value: any) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const n = Number(value);
    return Number.isNaN(n) || n <= 0 ? null : n;
  }

  private normalizeDateTime(value: any) {
    const text = String(value || '').trim();
    return text || null;
  }

  private now() {
    return moment().format('YYYY-MM-DD HH:mm:ss');
  }

  private randomDigits(length: number) {
    return String(Math.floor(Math.random() * 10 ** length)).padStart(length, '0');
  }

  private async getQuoteOptionScope(): Promise<QuoteOptionScope> {
    const userId = Number(this.ctx.admin?.userId || 0);
    const roleIds: number[] = this.ctx.admin?.roleIds || [];
    const roles = roleIds.length
      ? await this.baseSysRoleEntity.findBy({ id: In(roleIds) })
      : [];
    const roleLabels = roles.map(item => item.label);
    const roleNames = roles.map(item => item.name);
    const isBoss = roleLabels.some(label =>
      this.SUPER_ROLE_LABELS.includes(label)
    );
    const isFinance =
      roleLabels.some(label => this.FINANCE_ROLE_LABELS.includes(label)) ||
      roleNames.some(name => this.FINANCE_ROLE_NAMES.includes(name));
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
      isFinance,
      isOfficeClerkManager,
      isOfficeClerk,
    };
  }

  private buildQuoteOptionScopeCondition(scope: QuoteOptionScope) {
    return this.buildQuoteScopeCondition(scope, 'a');
  }

  private buildQuoteScopeSql(scope: QuoteOptionScope, quoteAlias = 'a') {
    if (scope.isBoss || scope.isFinance) {
      return '';
    }

    if (scope.isOfficeClerkManager) {
      return this.setSql(
        true,
        `and (
          exists (
            select 1
            from crm_quote_order_department_audit da
            where da.quoteOrderId = ${quoteAlias}.id
              and da.isDeleted = 0
              and (
                da.departmentId in (?)
                or da.assigneeId in (?)
              )
          )
          or ${quoteAlias}.currentAssigneeId in (?)
        )`,
        [
          scope.departmentIds.length ? scope.departmentIds : [null],
          scope.departmentUserIds.length ? scope.departmentUserIds : [null],
          scope.departmentUserIds.length ? scope.departmentUserIds : [null],
        ]
      );
    }

    if (scope.isOfficeClerk) {
      return this.setSql(
        true,
        `and (
          ${quoteAlias}.currentAssigneeId = ?
          or exists (
            select 1
            from crm_quote_order_department_audit da
            where da.quoteOrderId = ${quoteAlias}.id
              and da.isDeleted = 0
              and da.assigneeId = ?
            )
        )`,
        [scope.userId, scope.userId]
      );
    }

    return this.setSql(true, `and ${quoteAlias}.salesmanId = ?`, [
      scope.userId,
    ]);
  }

  private buildQuoteScopeCondition(scope: QuoteOptionScope, quoteAlias = 'a') {
    if (scope.isBoss || scope.isFinance) {
      return {
        sql: '',
        params: [],
      };
    }

    if (scope.isOfficeClerkManager) {
      const departmentIds = this.toSqlNumberList(scope.departmentIds);
      const departmentUserIds = this.toSqlNumberList(scope.departmentUserIds);

      return {
        sql: `and (
          exists (
            select 1
            from crm_quote_order_department_audit da
            where da.quoteOrderId = ${quoteAlias}.id
              and da.isDeleted = 0
              and (
                da.departmentId in (${departmentIds})
                or da.assigneeId in (${departmentUserIds})
              )
          )
          or ${quoteAlias}.currentAssigneeId in (${departmentUserIds})
        )`,
        params: [],
      };
    }

    if (scope.isOfficeClerk) {
      const userId = this.toSqlNumber(scope.userId);

      return {
        sql: `and (
          ${quoteAlias}.currentAssigneeId = ${userId}
          or exists (
            select 1
            from crm_quote_order_department_audit da
            where da.quoteOrderId = ${quoteAlias}.id
              and da.isDeleted = 0
              and da.assigneeId = ${userId}
            )
        )`,
        params: [],
      };
    }

    return {
      sql: `and ${quoteAlias}.salesmanId = ${this.toSqlNumber(scope.userId)}`,
      params: [],
    };
  }

  private toSqlNumber(value: any) {
    const n = Number(value || 0);
    return Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : '0';
  }

  private toSqlNumberList(values: any[]) {
    const numbers = (Array.isArray(values) ? values : [])
      .map(value => Number(value || 0))
      .filter(value => Number.isFinite(value) && value > 0)
      .map(value => String(Math.trunc(value)));

    return numbers.length ? numbers.join(',') : 'NULL';
  }

  private async assertQuoteOrderAccess(quoteOrderId: number) {
    const scope = await this.getQuoteOptionScope();
    const restrict = this.buildQuoteScopeCondition(scope, 'a');
    if (!restrict.sql) {
      return;
    }
    const rows = await this.nativeQuery(
      `
      SELECT COUNT(1) AS count
      FROM crm_quote_order a
      WHERE a.id = ?
        AND a.isDeleted = 0
        ${restrict.sql}
      `,
      [quoteOrderId, ...restrict.params]
    );
    if (Number(rows?.[0]?.count || 0) <= 0) {
      throw new CoolCommException('無權限操作該報價單的匯款單');
    }
  }

  private async assertRemittanceAccess(remittanceId: number) {
    const scope = await this.getQuoteOptionScope();
    const restrict = this.buildQuoteScopeCondition(scope, 'q');
    if (!restrict.sql) {
      return;
    }
    const rows = await this.nativeQuery(
      `
      SELECT COUNT(1) AS count
      FROM crm_remittance a
      LEFT JOIN crm_quote_order q ON q.id = a.quoteOrderId
      WHERE a.id = ?
        AND a.isDeleted = 0
        ${restrict.sql}
      `,
      [remittanceId, ...restrict.params]
    );
    if (Number(rows?.[0]?.count || 0) <= 0) {
      throw new CoolCommException('無權限操作該匯款單');
    }
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
}
