import { Inject, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Context } from '@midwayjs/koa';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { In, Repository } from 'typeorm';
import * as moment from 'moment';
import * as fs from 'fs';
import * as path from 'path';
import { BaseSysPermsService } from '../../base/service/sys/perms';
import { BaseSysRoleService } from '../../base/service/sys/role';
import { BaseSysUserEntity } from '../../base/entity/sys/user';
import { BaseSysRoleEntity } from '../../base/entity/sys/role';
import { BaseSysDepartmentEntity } from '../../base/entity/sys/department';
import { CrmCustomerInfoEntity } from '../entity/info';
import { CrmQuoteOrderEntity } from '../entity/quoteOrder';
import { CrmQuoteOrderItemEntity } from '../entity/quoteItem';
import { CrmQuoteOrderStageEntity } from '../entity/quoteStage';
import { CrmQuoteOrderDepartmentAuditEntity } from '../entity/quoteDepartmentAudit';
import { CrmQuoteOrderHistoryEntity } from '../entity/quoteHistory';
import { CrmQuoteInvoiceEntity } from '../entity/quoteInvoice';
import { ProductInfoEntity } from '../../product/entity/info';
import { ProductSpecEntity } from '../../product/entity/spec';
import { SALESMAN_ROLE_LABEL } from './info';
import { BaseSysParamService } from '../../base/service/sys/param';
import { CrmEcpayInvoiceService } from './ecpayInvoice';
import { CrmQuoteBankAccountService } from './quoteBankAccount';
import { pUploadPath } from '../../../comm/path';

interface QuoteScope {
  userId: number;
  roleLabels: string[];
  hasDiscountAuditPerm: boolean;
  departmentIds: number[];
  departmentUserIds: number[];
  isBoss: boolean;
  isFinance: boolean;
  isOfficeClerkManager: boolean;
  isOfficeClerk: boolean;
  isSalesperson: boolean;
}

interface QuotePdfLine {
  text: string;
  size?: number;
  gap?: number;
}

interface QuoteTermItem {
  no?: number | string;
  text: string;
}

interface QuoteTermSection {
  title: string;
  items: QuoteTermItem[];
}

@Provide()
export class CrmQuoteOrderService extends BaseService {
  private readonly SUPER_ROLE_LABELS = ['admin', 'boss'];

  private readonly FINANCE_ROLE_LABELS = ['finance', 'financial', 'accountant'];

  private readonly FINANCE_ROLE_NAMES = ['財務', '財務', 'finance', 'financial', 'accountant'];

  private readonly INTERNAL_ROLE_LABEL = 'office_clerk';

  private readonly INTERNAL_MANAGER_ROLE_LABEL = 'office_clerk_manager';

  private readonly INTERNAL_ROLE_NAMES = ['內勤', '內勤', 'office_clerk'];

  private readonly INTERNAL_MANAGER_ROLE_NAMES = [
    '內勤主管',
    '內勤主管',
    'office_clerk_manager',
  ];

  private readonly DEFAULT_QUOTE_PAYMENT_CONDITION =
    '付款方式：專案金額(含營業稅)共計新台幣 {finalAmount} 元整，甲方於收到發票後，30 天內以匯款方式支付款項至乙方指定帳號，匯款後提供後五碼及匯款日期以便甲方核對。\n*本欄請注意：本單須雙方簽立完成後，送交乙方才會始得進行委刊作業。';

  private readonly DEFAULT_QUOTE_PARTY_B = {
    companyName: '確認鍵智創科技股份有限公司',
    address: '',
    taxNumber: '',
    contactName: 'vicky',
    email: 'vicky@enterimc.com',
    mobile: '',
    bankAccountName: '確認鍵智創科技股份有限公司',
    bankCode: '012',
    bankName: '臺北富邦銀行',
    bankAccountNo: '82110000259100',
    bankCoverUrl: '/quote-bank-cover.jpg',
    companySealUrl: '',
  };

  private readonly VIP_MAX_DISCOUNT_RATE = 15;

  private readonly VIP_DISCOUNT_AUDIT_REASON =
    '優惠比例超過VIP最大額度15%，需要老闆審批，審批是否扣除獎金';

  private readonly DEFAULT_DISCOUNT_AUDIT_REASON =
    '優惠比例超過預設閾值，需要老闆審批，審批是否扣除獎金';

  @InjectEntityModel(CrmQuoteOrderEntity)
  crmQuoteOrderEntity: Repository<CrmQuoteOrderEntity>;

  @InjectEntityModel(CrmQuoteOrderItemEntity)
  crmQuoteOrderItemEntity: Repository<CrmQuoteOrderItemEntity>;

  @InjectEntityModel(CrmQuoteOrderStageEntity)
  crmQuoteOrderStageEntity: Repository<CrmQuoteOrderStageEntity>;

  @InjectEntityModel(CrmQuoteOrderDepartmentAuditEntity)
  crmQuoteOrderDepartmentAuditEntity: Repository<CrmQuoteOrderDepartmentAuditEntity>;

  @InjectEntityModel(CrmQuoteOrderHistoryEntity)
  crmQuoteOrderHistoryEntity: Repository<CrmQuoteOrderHistoryEntity>;

  @InjectEntityModel(CrmQuoteInvoiceEntity)
  crmQuoteInvoiceEntity: Repository<CrmQuoteInvoiceEntity>;

  @InjectEntityModel(CrmCustomerInfoEntity)
  crmCustomerInfoEntity: Repository<CrmCustomerInfoEntity>;

  @InjectEntityModel(BaseSysUserEntity)
  baseSysUserEntity: Repository<BaseSysUserEntity>;

  @InjectEntityModel(BaseSysRoleEntity)
  baseSysRoleEntity: Repository<BaseSysRoleEntity>;

  @InjectEntityModel(BaseSysDepartmentEntity)
  baseSysDepartmentEntity: Repository<BaseSysDepartmentEntity>;

  @InjectEntityModel(ProductInfoEntity)
  productInfoEntity: Repository<ProductInfoEntity>;

  @InjectEntityModel(ProductSpecEntity)
  productSpecEntity: Repository<ProductSpecEntity>;

  @Inject()
  ctx: Context;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  @Inject()
  baseSysRoleService: BaseSysRoleService;

  @Inject()
  baseSysParamService: BaseSysParamService;

  @Inject()
  crmEcpayInvoiceService: CrmEcpayInvoiceService;

  @Inject()
  crmQuoteBankAccountService: CrmQuoteBankAccountService;

  async isBoss(): Promise<boolean> {
    const roleIds = this.ctx.admin?.roleIds || [];
    return this.baseSysPermsService.isAdmin(roleIds);
  }

  async page(query: any) {
    const scope = await this.getScope();
    const {
      customerId,
      quoteNo,
      quoteName,
      status,
      quoteType,
      discountAuditFilter,
    } = query || {};

    const restrictSql = this.buildPageScopeSql(scope);
    const businessStatusSql = this.getBusinessStatusSql();

    const sql = `
      SELECT
        a.*,
        ${businessStatusSql} AS businessStatus,
        (
          SELECT COUNT(1)
          FROM crm_quote_invoice qi
          WHERE qi.quoteOrderId = a.id
            AND qi.isDeleted = 0
            AND qi.status = 2
            AND IFNULL(qi.ecpayInvalidStatus, 0) <> 2
            AND qi.voidTime IS NULL
        ) AS issuedInvoiceCount,
        c.companyName AS customerCompanyName,
        c.address AS customerAddress,
        c.taxNumber AS customerTaxNumber,
        c.remittanceLast5 AS customerRemittanceLast5,
        c.contactName AS customerContactName,
        c.mobile AS customerMobile,
        c.email AS customerEmail,
        c.isVip AS customerIsVip,
        u.name AS salesmanName,
        u3.name AS accompanySalesmanName,
        u2.name AS currentAssigneeName
      FROM crm_quote_order a
      LEFT JOIN crm_customer_info c ON c.id = a.customerId
      LEFT JOIN base_sys_user u ON u.id = a.salesmanId
      LEFT JOIN base_sys_user u3 ON u3.id = a.accompanySalesmanId
      LEFT JOIN base_sys_user u2 ON u2.id = a.currentAssigneeId
        WHERE a.isDeleted = 0
          ${restrictSql.sql}
          ${this.setSql(customerId, 'and a.customerId = ?', [Number(customerId)])}
          ${this.setSql(quoteNo, 'and a.quoteNo like ?', [`%${quoteNo}%`])}
        ${this.setSql(quoteName, 'and a.quoteName like ?', [`%${quoteName}%`])}
        ${this.setSql(status, `and ${businessStatusSql} = ?`, [
          Number(status),
        ])}
        ${this.setSql(quoteType, 'and a.quoteType = ?', [Number(quoteType)])}
        ${this.buildDiscountAuditFilterSql(discountAuditFilter)}
      ORDER BY a.createTime DESC
    `;

    const result: any = await this.sqlRenderPage(
      sql,
      { ...query, ...restrictSql.params },
      false
    );

    result.list = await Promise.all(
      (result.list || []).map(async (row: any) => ({
        ...row,
        status: Number(row.businessStatus || row.status || 0),
        viewerSalesIdentity: this.getViewerSalesIdentity(row, scope),
        permissions: {
          ...this.buildPermissions(row, scope),
          ...(await this.buildCaseMeetingPermissions(row, scope)),
          ...(await this.buildDepartmentPermissionSummary(row.id, scope)),
        },
      }))
    );

    return result;
  }

  async info(id: number | string) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(id), scope, {
      allowFinanceRead: true,
    });
    const detail = await this.fetchOrderDetail(order.id);

    const [items, stages, invoices, auditRows] = await Promise.all([
      this.crmQuoteOrderItemEntity.find({
        where: { quoteOrderId: order.id, isDeleted: 0 },
        order: { sortNum: 'ASC', id: 'ASC' },
      }),
      this.crmQuoteOrderStageEntity.find({
        where: { quoteOrderId: order.id, isDeleted: 0 },
        order: { sortNum: 'ASC', id: 'ASC' },
      }),
      this.crmQuoteInvoiceEntity.find({
        where: { quoteOrderId: order.id, isDeleted: 0 },
        order: { createTime: 'DESC', id: 'DESC' },
      }),
      this.fetchDepartmentAudits(order.id),
    ]);
    const decoratedStages = this.decorateStagesWithInvoiceMeta(stages, invoices);
    const departmentAudits = auditRows.map(audit => ({
      ...audit,
      items: items.filter(
        item =>
          Number(item.departmentId || 0) === Number(audit.departmentId || 0)
      ),
      permissions: {
        canAudit: this.canAuditDepartment(audit, scope),
        canAssign: this.canAssignDepartment(audit, order, scope),
        canSubmitCost: this.canSubmitDepartmentCost(audit, scope),
      },
    }));

    return {
      ...detail,
      items,
      stages: decoratedStages,
      departmentAudits,
      contractList: detail?.contractFile
        ? [
            {
              fileId: detail.contractFile,
              fileName: detail.contractFileName,
              uploadTime: detail.contractUploadTime,
              remark: detail.contractRemark,
            },
          ]
        : [],
      permissions: {
        ...this.buildPermissions(order, scope),
        ...(await this.buildCaseMeetingPermissions(order, scope)),
        ...(await this.buildDepartmentPermissionSummary(order.id, scope)),
      },
      editableFields: this.buildEditableFields(order, scope),
    };
  }

  async add(param: any) {
    const customer = await this.getCustomerById(
      Number(param?.customerId),
      true
    );
    const items = await this.normalizeItems(param?.items || []);
    const itemSummary = this.calcSummary(items);
    const summary = this.resolveSummary(param, itemSummary);
    const stages = this.normalizeStages(
      param?.stages || [],
      summary.finalAmount
    );
    const salesmanId = Number(this.ctx.admin?.userId || customer.salesmanId || 0);
    const accompanySalesmanId = await this.normalizeAccompanySalesmanId(
      param?.accompanySalesmanId,
      salesmanId
    );
    const bankAccountId = await this.normalizeBankAccountId(param?.bankAccountId);
    const quoteNoPrefix = await this.getQuoteNoPrefix(salesmanId);
    const contractFile = String(param?.contractFile || '').trim();
    const hasContract = !!contractFile;
    const discountRate = this.toRatePercent(param?.discountRate);
    const discountAudit = await this.resolveDiscountAudit(customer, discountRate);
    const discountDeductionAmount = 0;
    const commission = this.toMoney(param?.commission || 0);
    const quoteTerms = await this.resolveQuoteTermsForSave(param);

    const saved = await this.crmQuoteOrderEntity.save({
      quoteNo: await this.generateQuoteNoSeed(),
      customerId: customer.id,
      quoteName: String(param?.quoteName || '').trim(),
      quoteType: this.normalizeQuoteType(param?.quoteType),
      salesmanId,
      accompanySalesmanId,
      bankAccountId,
      currentAssigneeId: null,
      status: 1,
      auditStatus: 0,
      assignStatus: 0,
      contractStatus: hasContract ? 1 : 0,
      invoiceStatus: 0,
      receiptStatus: 0,
      paymentStatus: 0,
      startDate: this.normalizeDate(param?.startDate),
      endDate: this.normalizeDate(param?.endDate),
      finalAmount: summary.finalAmount,
      costAmount: summary.costAmount,
      grossProfitAmount: summary.grossProfitAmount,
      grossProfitRate: summary.grossProfitRate,
      discountDeductionAmount,
      discountRate,
      commission,
      discountAuditStatus: discountAudit.required ? 1 : 0,
      discountAuditReason: discountAudit.reason || null,
      discountAuditUserId: null,
      discountAuditTime: null,
      discountAuditRemark: null,
      execRemark: String(param?.execRemark || '').trim() || null,
      priceRemark: String(param?.priceRemark || '').trim() || null,
      quoteTerms,
      remark: String(param?.remark || '').trim() || null,
      contractFile: contractFile || null,
      contractFileName: String(param?.contractFileName || '').trim() || null,
      contractUploadUserId: hasContract ? this.ctx.admin?.userId || null : null,
      contractUploadTime: hasContract ? this.now() : null,
      caseMeetingFlag: 1,
      isDeleted: 0,
    });
    saved.quoteNo = await this.assignSavedQuoteNo(
      saved.id,
      saved.createTime,
      quoteNoPrefix
    );

    await this.saveItems(saved.id, items);
    await this.saveStages(saved.id, stages);
    await this.syncDepartmentAudits(saved.id, items);
    await this.saveQuoteHistory(saved.id);
    await this.crmCustomerInfoEntity.update({ id: customer.id }, { status: 3 });

    return {
      id: saved.id,
      quoteNo: saved.quoteNo,
      discountAuditRequired: discountAudit.required,
      discountAuditReason: discountAudit.reason || '',
    };
  }

  async update(param: any): Promise<any> {
    return this.saveOrderUpdate(param, false);
  }

  async applyAllowance(param: any): Promise<any> {
    return this.applyAllowanceUpdate(param);
  }

  private async applyAllowanceUpdate(param: any): Promise<any> {
    const scope = await this.getScope();
    const id = Number(param?.id || 0);
    const oldRow = await this.getOrderById(id, scope);
    await this.ensureCanApplyAllowance(oldRow, scope);
    await this.ensureAllowanceItemsAndDiscountStable(id, param, oldRow);

    const customer = await this.getCustomerById(
      Number(param?.customerId || oldRow.customerId),
      true
    );
    const rawStages = Array.isArray(param?.stages) ? param.stages : [];
    const items = await this.normalizeItems(param?.items || []);
    const itemSummary = this.calcSummary(items);
    const summary = this.resolveSummary(param, itemSummary);
    const stages = this.normalizeStages(rawStages, summary.finalAmount);

    const currentInvoices = await this.crmQuoteInvoiceEntity.find({
      where: { quoteOrderId: id, isDeleted: 0 },
      order: { id: 'ASC' },
    });
    const activeIssuedInvoices = currentInvoices.filter(
      item =>
        Number(item.status || 0) === 2 &&
        Number(item.ecpayInvalidStatus || 0) !== 2 &&
        !item.voidTime
    );

    const allowanceDecision = this.buildAllowanceDecisionSummary(
      rawStages,
      stages,
      activeIssuedInvoices
    );

    await this.crmQuoteOrderEntity.save({
      ...oldRow,
      id,
      customerId: customer.id,
      quoteName: String(param?.quoteName || '').trim(),
      quoteType: this.normalizeQuoteType(param?.quoteType),
      salesmanId: Number(
        customer.salesmanId || oldRow.salesmanId || this.ctx.admin?.userId || 0
      ),
      accompanySalesmanId: await this.normalizeAccompanySalesmanId(
        Object.prototype.hasOwnProperty.call(param || {}, 'accompanySalesmanId')
          ? param?.accompanySalesmanId
          : oldRow.accompanySalesmanId,
        Number(customer.salesmanId || oldRow.salesmanId || this.ctx.admin?.userId || 0)
      ),
      bankAccountId: await this.normalizeBankAccountId(
        Object.prototype.hasOwnProperty.call(param || {}, 'bankAccountId')
          ? param?.bankAccountId
          : oldRow.bankAccountId
      ),
      startDate: this.normalizeDate(param?.startDate),
      endDate: this.normalizeDate(param?.endDate),
      finalAmount: summary.finalAmount,
      costAmount: summary.costAmount,
      grossProfitAmount: summary.grossProfitAmount,
      grossProfitRate: summary.grossProfitRate,
      remark: String(param?.remark || '').trim() || null,
      execRemark: String(param?.execRemark || '').trim() || null,
      priceRemark: String(param?.priceRemark || '').trim() || null,
      quoteTerms: Object.prototype.hasOwnProperty.call(param || {}, 'quoteTerms')
        ? await this.resolveQuoteTermsForSave(param, oldRow)
        : oldRow.quoteTerms,
      discountRate: this.toRatePercent(oldRow.discountRate),
      commission: Object.prototype.hasOwnProperty.call(param || {}, 'commission')
        ? this.toMoney(param?.commission || 0)
        : this.toMoney(oldRow.commission || 0),
      discountDeductionAmount: 0,
      discountAuditStatus: oldRow.discountAuditStatus,
      discountAuditReason: oldRow.discountAuditReason,
      discountAuditUserId: oldRow.discountAuditUserId,
      discountAuditTime: oldRow.discountAuditTime,
      discountAuditRemark: oldRow.discountAuditRemark,
      isDeleted: 0,
    });

    await this.replaceItems(id, items);
    await this.replaceStages(id, stages);
    await this.syncDepartmentAudits(id, items);
    await this.executeAllowanceInvoiceStrategy(
      oldRow,
      allowanceDecision,
      activeIssuedInvoices,
      stages
    );
    await this.crmQuoteOrderEntity.update(
      { id },
      {
        allowanceApplyStatus: 1,
        allowanceApplyUserId: this.ctx.admin?.userId || null,
        allowanceApplyTime: this.now(),
      }
    );
    await this.refreshOrderReceiptAndInvoiceStatus(id);
    await this.saveQuoteHistory(id);

    return {
      id,
      allowanceAction: allowanceDecision.action,
      expectedIssuedInvoiceAmount: allowanceDecision.expectedIssuedInvoiceAmount,
      appliedInvoiceAmount: allowanceDecision.appliedInvoiceAmount,
      uninvoicedAmount: allowanceDecision.uninvoicedAmount,
    };
  }

  private async ensureAllowanceItemsAndDiscountStable(
    quoteOrderId: number,
    param: any,
    oldRow: any
  ) {
    if (
      Object.prototype.hasOwnProperty.call(param || {}, 'discountRate') &&
      this.toRatePercent(param?.discountRate) !==
        this.toRatePercent(oldRow?.discountRate)
    ) {
      throw new CoolCommException('申請折讓不支援修改優惠折扣');
    }

    const incomingItems = Array.isArray(param?.items) ? param.items : [];
    const existingItems = await this.crmQuoteOrderItemEntity.find({
      where: { quoteOrderId, isDeleted: 0 },
      order: { sortNum: 'ASC', id: 'ASC' },
    });

    if (incomingItems.length !== existingItems.length) {
      throw new CoolCommException('申請折讓不支援新增或刪除產品');
    }

    for (let index = 0; index < existingItems.length; index++) {
      const incomingItem = incomingItems[index] || {};
      const existingItem = existingItems[index];
      const incomingProductId = Number(incomingItem?.productId || 0);
      const existingProductId = Number(existingItem?.productId || 0);
      const incomingSpecId = Number(incomingItem?.specId || 0);
      const existingSpecId = Number(existingItem?.specId || 0);

      if (
        incomingProductId !== existingProductId ||
        incomingSpecId !== existingSpecId
      ) {
        throw new CoolCommException('申請折讓不支援新增產品或更換產品規格');
      }
    }
  }

  private async saveOrderUpdate(
    param: any,
    isAllowanceUpdate: boolean
  ): Promise<any> {
    const scope = await this.getScope();
    const id = Number(param?.id || 0);
    const oldRow = await this.getOrderById(id, scope);
    if (isAllowanceUpdate) {
      await this.ensureCanApplyAllowance(oldRow, scope);
    } else {
      this.ensureCanEdit(oldRow, scope);
    }

    if (!isAllowanceUpdate && this.isPaymentStageOnlyEditable(oldRow)) {
      this.ensurePaymentStageOnlyUpdatePayload(param);
      const stages = this.normalizeStages(
        param?.stages || [],
        this.toMoney(oldRow.finalAmount)
      );
      await this.ensurePaymentStagesEditableAfterApproved(id);
      await this.replaceStages(id, stages);
      await this.refreshOrderReceiptAndInvoiceStatus(id);
      await this.saveQuoteHistory(id);
      return;
    }

    const customer = await this.getCustomerById(
      Number(param?.customerId || oldRow.customerId),
      true
    );
    const items = await this.normalizeItems(param?.items || []);
    const itemSummary = this.calcSummary(items);
    const summary = this.resolveSummary(param, itemSummary);
    const stages = this.normalizeStages(
      param?.stages || [],
      summary.finalAmount
    );
    const hasContractField =
      Object.prototype.hasOwnProperty.call(param || {}, 'contractFile') ||
      Object.prototype.hasOwnProperty.call(param || {}, 'contractFileName');
    const contractFile = hasContractField
      ? String(param?.contractFile || '').trim()
      : undefined;
    const hasContract = !!contractFile;
    const hasDiscountDeductionField = Object.prototype.hasOwnProperty.call(
      param || {},
      'discountDeductionAmount'
    );
    const hasDiscountRateField = Object.prototype.hasOwnProperty.call(
      param || {},
      'discountRate'
    );
    const hasCommissionField = Object.prototype.hasOwnProperty.call(
      param || {},
      'commission'
    );
    const hasExecRemarkField = Object.prototype.hasOwnProperty.call(
      param || {},
      'execRemark'
    );
    const hasPriceRemarkField = Object.prototype.hasOwnProperty.call(
      param || {},
      'priceRemark'
    );

    const payload: Partial<CrmQuoteOrderEntity> = {
      ...oldRow,
      customerId: customer.id,
      quoteName: String(param?.quoteName || '').trim(),
      quoteType: this.normalizeQuoteType(param?.quoteType),
      salesmanId: Number(
        customer.salesmanId || oldRow.salesmanId || this.ctx.admin?.userId || 0
      ),
      startDate: this.normalizeDate(param?.startDate),
      endDate: this.normalizeDate(param?.endDate),
      finalAmount: summary.finalAmount,
      costAmount: summary.costAmount,
      grossProfitAmount: summary.grossProfitAmount,
      grossProfitRate: summary.grossProfitRate,
      remark: String(param?.remark || '').trim() || null,
      isDeleted: 0,
    };
    payload.accompanySalesmanId = await this.normalizeAccompanySalesmanId(
      Object.prototype.hasOwnProperty.call(param || {}, 'accompanySalesmanId')
        ? param?.accompanySalesmanId
        : oldRow.accompanySalesmanId,
      Number(payload.salesmanId || 0)
    );
    if (Object.prototype.hasOwnProperty.call(param || {}, 'bankAccountId')) {
      payload.bankAccountId = await this.normalizeBankAccountId(
        param?.bankAccountId
      );
    }
    const shouldResubmitDepartmentAudit =
      Number(oldRow.status || 0) === 3 || Number(oldRow.auditStatus || 0) === 3;

    if (shouldResubmitDepartmentAudit) {
      Object.assign(payload, {
        status: 2,
        auditStatus: 1,
        assignStatus: 0,
        currentAssigneeId: null,
        auditUserId: null,
        auditTime: null,
        auditRemark: null,
        assignUserId: null,
        assignTime: null,
        assignRemark: null,
      });
    }

    if (hasContractField) {
      payload.contractStatus = hasContract ? 1 : 0;
      payload.contractFile = contractFile || null;
      payload.contractFileName =
        String(param?.contractFileName || '').trim() || null;
      payload.contractUploadUserId = hasContract
        ? Number(oldRow.contractUploadUserId || this.ctx.admin?.userId || 0) ||
          null
        : null;
      payload.contractUploadTime = hasContract
        ? oldRow.contractUploadTime || this.now()
        : null;
      payload.caseMeetingFlag = 1;
    }

    if (hasDiscountRateField) {
      payload.discountRate = this.toRatePercent(param?.discountRate);
    }

    if (hasDiscountDeductionField || hasDiscountRateField) {
      payload.discountDeductionAmount =
        Number(oldRow.discountAuditStatus || 0) === 3
          ? this.calcDiscountDeductionAmount(
              itemSummary.finalAmount,
              payload.discountRate ?? oldRow.discountRate,
              await this.getDiscountDeductionBaseRate(oldRow)
            )
          : 0;
    }

    if (hasCommissionField) {
      payload.commission = this.toMoney(param?.commission || 0);
    }

    if (hasExecRemarkField) {
      payload.execRemark = String(param?.execRemark || '').trim() || null;
    }

    if (hasPriceRemarkField) {
      payload.priceRemark = String(param?.priceRemark || '').trim() || null;
    }

    if (Object.prototype.hasOwnProperty.call(param || {}, 'quoteTerms')) {
      payload.quoteTerms = await this.resolveQuoteTermsForSave(param, oldRow);
    }

    const nextDiscountRate = this.toRatePercent(
      payload.discountRate ?? oldRow.discountRate
    );
    const discountAudit = await this.resolveDiscountAudit(
      customer,
      nextDiscountRate
    );
    if (discountAudit.required) {
      Object.assign(payload, {
        status: 1,
        auditStatus: 0,
        assignStatus: 0,
        currentAssigneeId: null,
        auditUserId: null,
        auditTime: null,
        auditRemark: null,
        assignUserId: null,
        assignTime: null,
        assignRemark: null,
        discountDeductionAmount: 0,
        discountAuditStatus: 1,
        discountAuditReason: discountAudit.reason || null,
        discountAuditUserId: null,
        discountAuditTime: null,
        discountAuditRemark: null,
      });
    } else if ([1, 4].includes(Number(oldRow.discountAuditStatus || 0))) {
      Object.assign(payload, {
        discountDeductionAmount: 0,
        discountAuditStatus: 0,
        discountAuditReason: null,
        discountAuditUserId: null,
        discountAuditTime: null,
        discountAuditRemark: null,
      });
    }

    await this.crmQuoteOrderEntity.save(payload);

    await this.replaceItems(id, items);
    await this.replaceStages(id, stages);
    await this.syncDepartmentAudits(id, items, {
      resetExisting: shouldResubmitDepartmentAudit,
    });
    await this.saveQuoteHistory(id);

    return {
      id,
      discountAuditRequired: discountAudit.required,
      discountAuditReason: discountAudit.reason || '',
    };
  }

  async delete(ids: number[] | number) {
    const idArr = this.toIdArray(ids);
    if (idArr.length === 0) {
      return;
    }

    const scope = await this.getScope();
    const rows = await this.crmQuoteOrderEntity.findBy({
      id: In(idArr),
      isDeleted: 0,
    });

    const allowedIds = rows
      .filter(row => this.canDeleteOrder(row, scope))
      .map(row => row.id);

    if (allowedIds.length === 0) {
      throw new CoolCommException('暫無可刪除的報價單');
    }

    await this.crmQuoteOrderEntity.update(
      { id: In(allowedIds) },
      { isDeleted: 1 }
    );
    await this.crmQuoteOrderItemEntity.update(
      { quoteOrderId: In(allowedIds) },
      { isDeleted: 1 }
    );
    await this.crmQuoteOrderStageEntity.update(
      { quoteOrderId: In(allowedIds) },
      { isDeleted: 1 }
    );
    await this.crmQuoteOrderDepartmentAuditEntity.update(
      { quoteOrderId: In(allowedIds) },
      { isDeleted: 1 }
    );
  }

  async customerOptions() {
    const scope = await this.getScope();
    const userId = scope.userId;

    if (scope.isFinance) {
      const sql = `
      SELECT DISTINCT
        a.id,
        a.companyName,
        a.address,
        a.taxNumber,
        a.remittanceLast5,
        a.contactName,
        a.mobile,
        a.email,
        a.isVip,
        a.salesmanId,
        b.name AS salesmanName
      FROM crm_customer_info a
      LEFT JOIN base_sys_user b ON b.id = a.salesmanId
      WHERE a.isDeleted = 0
      ORDER BY a.companyName ASC, a.id ASC
    `;
      return this.nativeQuery(sql);
    }

    if (scope.isOfficeClerk) {
      const sql = `
      SELECT DISTINCT
        c.id,
        c.companyName,
        c.address,
        c.taxNumber,
        c.remittanceLast5,
        c.contactName,
        c.mobile,
        c.email,
        c.isVip,
        c.salesmanId,
        u.name AS salesmanName
        FROM crm_quote_order q
        INNER JOIN crm_customer_info c ON c.id = q.customerId
        LEFT JOIN base_sys_user u ON u.id = c.salesmanId
        WHERE q.isDeleted = 0
          AND c.isDeleted = 0
          AND (
            q.currentAssigneeId = ?
            OR EXISTS (
              SELECT 1
              FROM crm_quote_order_department_audit da
              WHERE da.quoteOrderId = q.id
                AND da.isDeleted = 0
                AND da.assigneeId = ?
            )
          )
        ORDER BY c.companyName ASC, c.id ASC
      `;
      return this.nativeQuery(sql, [userId, userId]);
    }

    const sql = `
      SELECT
        a.id,
        a.companyName,
        a.address,
        a.taxNumber,
        a.remittanceLast5,
        a.contactName,
        a.mobile,
        a.email,
        a.isVip,
        a.salesmanId,
        b.name AS salesmanName
      FROM crm_customer_info a
      LEFT JOIN base_sys_user b ON b.id = a.salesmanId
      WHERE a.isDeleted = 0
        AND a.salesmanId IS NOT NULL
        ${this.setSql(
          !scope.isBoss && !scope.isOfficeClerkManager,
          'and a.salesmanId = ?',
          [userId]
        )}
      ORDER BY a.companyName ASC, a.id ASC
    `;

    return this.nativeQuery(sql);
  }

  async productOptions() {
    const [products, specs, departments] = await Promise.all([
      this.productInfoEntity.find({
        where: { isDeleted: 0, status: 1 },
        order: { createTime: 'DESC', id: 'DESC' },
      }),
      this.productSpecEntity.find({
        where: { isDeleted: 0 },
        order: { orderNum: 'ASC', id: 'ASC' },
      }),
      this.baseSysDepartmentEntity.find(),
    ]);

    const specMap = new Map<number, any[]>();
    for (const spec of specs) {
      const list = specMap.get(Number(spec.productId)) || [];
      list.push(spec);
      specMap.set(Number(spec.productId), list);
    }

    const departmentMap = new Map<number, any>();
    for (const department of departments) {
      departmentMap.set(Number(department.id), department);
    }

    return products.map(product => ({
      ...product,
      departmentName:
        departmentMap.get(Number(product.departmentId || 0))?.name || '',
      specs: specMap.get(Number(product.id)) || [],
    }));
  }

  async salesmanOptions() {
    const rows = await this.nativeQuery(
      `
      SELECT DISTINCT
        a.id,
        a.name,
        a.nickName,
        a.username
      FROM base_sys_user a
      INNER JOIN base_sys_user_role ur ON ur.userId = a.id
      INNER JOIN base_sys_role r ON r.id = ur.roleId
      WHERE a.status = 1
        AND a.username != 'admin'
        AND r.label = ?
      ORDER BY a.name ASC, a.id ASC
    `,
      [SALESMAN_ROLE_LABEL]
    );

    return rows || [];
  }

  async assigneeOptions() {
    const scope = await this.getScope();
    if (!scope.isOfficeClerkManager) {
      throw new CoolCommException('僅內勤主管可查看內勤人員選項');
    }

    const rows = await this.nativeQuery(
      `
      SELECT DISTINCT
        a.id,
        a.name,
        a.nickName,
        a.username,
        a.level,
        a.departmentId
      FROM base_sys_user a
      INNER JOIN base_sys_user_role ur ON ur.userId = a.id
      INNER JOIN base_sys_role r ON r.id = ur.roleId
      WHERE a.status = 1
        AND a.username != 'admin'
        AND r.label IN (?, ?)
      ORDER BY a.name ASC, a.id ASC
    `,
      [this.INTERNAL_ROLE_LABEL, this.INTERNAL_MANAGER_ROLE_LABEL]
    );

    return rows || [];
  }

  async duty() {
    return await this.baseSysParamService.dataByKey('duty');
  }

  async submitAudit(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    this.ensureDiscountAuditPassed(order);
    this.ensureCanSubmitAudit(order, scope);
    const items = await this.crmQuoteOrderItemEntity.find({
      where: { quoteOrderId: order.id, isDeleted: 0 },
    });
    await this.syncDepartmentAudits(order.id, items);

    await this.crmQuoteOrderEntity.update(
      { id: order.id },
      {
        status: 2,
        auditStatus: 1,
        assignStatus: 0,
        currentAssigneeId: null,
        auditUserId: null,
        auditTime: null,
        auditRemark: null,
        assignUserId: null,
        assignTime: null,
        assignRemark: null,
      }
    );

    return {
      id: order.id,
      status: 2,
      auditStatus: 1,
    };
  }

  async audit(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    this.ensureCanAudit(order, scope);

    const auditStatus = Number(param?.auditStatus);
    if (![2, 3].includes(auditStatus)) {
      throw new CoolCommException('請選擇審核結果');
    }

    const auditTime = this.now();
    const auditRemark = String(param?.auditRemark || '').trim() || null;
    const payload: Partial<CrmQuoteOrderEntity> = {
      auditStatus,
      auditUserId: scope.userId,
      auditTime,
      auditRemark,
    };

    if (auditStatus === 2) {
      payload.status = 4;
      payload.assignStatus = 1;
      payload.currentAssigneeId = null;
    } else {
      payload.status = 3;
      payload.assignStatus = 0;
      payload.currentAssigneeId = null;
      payload.assignUserId = null;
      payload.assignTime = null;
      payload.assignRemark = null;
    }

    await this.crmQuoteOrderEntity.update({ id: order.id }, payload);

    if (auditStatus === 2) {
      return {
        id: order.id,
        status: 4,
        auditStatus: 2,
        assignStatus: 1,
      };
    }

    return {
      id: order.id,
      status: 3,
      auditStatus: 3,
    };
  }

  async auditDiscount(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    if (!this.canDiscountAudit(order, scope)) {
      throw new CoolCommException('當前報價單不允許優惠審批');
    }

    const discountAuditStatus = Number(param?.discountAuditStatus);
    if (![2, 3, 4].includes(discountAuditStatus)) {
      throw new CoolCommException('請選擇優惠審批結果');
    }

    const payload: Partial<CrmQuoteOrderEntity> = {
      discountAuditStatus,
      discountAuditUserId: scope.userId,
      discountAuditTime: this.now(),
      discountAuditRemark: String(param?.remark || '').trim() || null,
    };

    if ([2, 3].includes(discountAuditStatus)) {
      payload.status = 2;
      payload.auditStatus = 1;
      payload.assignStatus = 0;
      payload.currentAssigneeId = null;
      payload.auditUserId = null;
      payload.auditTime = null;
      payload.auditRemark = null;
      payload.assignUserId = null;
      payload.assignTime = null;
      payload.assignRemark = null;
      payload.discountDeductionAmount =
        discountAuditStatus === 3
          ? this.calcDiscountDeductionAmount(
              await this.getQuoteOrderItemsAmount(order.id),
              order.discountRate,
              await this.getDiscountDeductionBaseRate(order)
            )
          : 0;
    } else {
      payload.status = 1;
      payload.auditStatus = 0;
      payload.assignStatus = 0;
      payload.currentAssigneeId = null;
      payload.discountDeductionAmount = 0;
    }

    await this.crmQuoteOrderEntity.update({ id: order.id }, payload);

    return {
      id: order.id,
      discountAuditStatus,
      status: payload.status,
      auditStatus: payload.auditStatus,
    };
  }

  async assign(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    this.ensureCanAssign(order, scope);

    const assigneeId = Number(param?.assigneeId || 0);
    if (!assigneeId) {
      throw new CoolCommException('請選擇內勤人員');
    }

    const assignee = await this.ensureAssigneeRole(assigneeId);
    const assignTime = this.now();
    const assignRemark = String(param?.remark || '').trim() || null;

    await this.crmQuoteOrderEntity.update(
      { id: order.id },
      {
        status: 4,
        assignStatus: 2,
        currentAssigneeId: assigneeId,
        assignUserId: scope.userId,
        assignTime,
        assignRemark,
      }
    );

    return {
      id: order.id,
      status: 4,
      assignStatus: 2,
      currentAssigneeId: assigneeId,
      currentAssigneeName:
        assignee.name || assignee.nickName || assignee.username,
    };
  }

  async departmentAudits(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    const [audits, items] = await Promise.all([
      this.fetchDepartmentAudits(order.id),
      this.crmQuoteOrderItemEntity.find({
        where: { quoteOrderId: order.id, isDeleted: 0 },
        order: { sortNum: 'ASC', id: 'ASC' },
      }),
    ]);

    return audits.map(audit => ({
      ...audit,
      items: items.filter(
        item =>
          Number(item.departmentId || 0) === Number(audit.departmentId || 0)
      ),
      permissions: {
        canAudit: this.canAuditDepartment(audit, scope),
        canAssign: this.canAssignDepartment(audit, order, scope),
        canSubmitCost: this.canSubmitDepartmentCost(audit, scope),
      },
    }));
  }

  async auditDepartment(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    const audit = await this.getDepartmentAudit(
      order.id,
      Number(param?.departmentId || 0)
    );
    if (!this.canAuditDepartment(audit, scope)) {
      throw new CoolCommException('當前無權限進行部門審核');
    }

    const auditStatus = Number(param?.auditStatus);
    if (![2, 3].includes(auditStatus)) {
      throw new CoolCommException('請選擇部門審核結果');
    }

    await this.crmQuoteOrderDepartmentAuditEntity.update(
      { id: audit.id },
      {
        auditStatus,
        auditUserId: scope.userId,
        auditTime: this.now(),
        auditRemark: String(param?.auditRemark || '').trim() || null,
        assignStatus: auditStatus === 2 ? 1 : 0,
        assigneeId: null,
        assignUserId: null,
        assignTime: null,
        assignRemark: null,
        costStatus: 0,
        costUserId: null,
        costTime: null,
      }
    );
    await this.refreshDepartmentAuditFlow(order.id);
  }

  async assignDepartment(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    const audit = await this.getDepartmentAudit(
      order.id,
      Number(param?.departmentId || 0)
    );
    if (!this.canAssignDepartment(audit, order, scope)) {
      if (
        scope.isOfficeClerkManager &&
        Number(audit.auditStatus || 0) === 2 &&
        Number(audit.assignStatus || 0) === 1 &&
        this.canManageDepartment(Number(audit.departmentId || 0), scope) &&
        Number(order.contractStatus || 0) !== 1
      ) {
        throw new CoolCommException('請等待業務回傳合約後再分配內勤人員');
      }
      throw new CoolCommException('當前無權限分配內勤人員');
    }

    const assigneeId = Number(param?.assigneeId || 0);
    if (!assigneeId) {
      throw new CoolCommException('請選擇內勤人員');
    }
    const assignee = await this.ensureDepartmentAssigneeRole(
      assigneeId,
      Number(audit.departmentId),
      scope
    );

    await this.crmQuoteOrderDepartmentAuditEntity.update(
      { id: audit.id },
      {
        assignStatus: 2,
        assigneeId,
        assignUserId: scope.userId,
        assignTime: this.now(),
        assignRemark: String(param?.remark || '').trim() || null,
      }
    );
    await this.refreshDepartmentAuditFlow(order.id);

    return {
      assigneeId,
      assigneeName: assignee.name || assignee.nickName || assignee.username,
    };
  }

  async departmentAssigneeOptions(param: any) {
    const scope = await this.getScope();
    const departmentId = Number(param?.departmentId || 0);
    if (!departmentId || !this.canManageDepartment(departmentId, scope)) {
      throw new CoolCommException('當前無權限查看內勤人員');
    }
    return this.listDepartmentInternalUsers(departmentId);
  }

  async submitDepartmentCosts(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    const audit = await this.getDepartmentAudit(
      order.id,
      Number(param?.departmentId || 0)
    );
    if (!this.canSubmitDepartmentCost(audit, scope)) {
      throw new CoolCommException('當前無權限提交成本');
    }

    const items = Array.isArray(param?.items) ? param.items : [];
    if (!items.length) {
      throw new CoolCommException('成本明細不能為空');
    }
    const itemIds = items
      .map(item => Number(item?.id || 0))
      .filter(id => id > 0);
    const oldItems = await this.crmQuoteOrderItemEntity.findBy({
      id: In(itemIds.length ? itemIds : [0]),
      quoteOrderId: order.id,
      departmentId: Number(audit.departmentId),
      isDeleted: 0,
    });
    const oldItemMap = new Map(oldItems.map(item => [Number(item.id), item]));

    for (const item of items) {
      const id = Number(item?.id || 0);
      const oldItem = oldItemMap.get(id);
      if (!oldItem) {
        continue;
      }
      const costPrice = this.toMoney(item?.costPrice);
      const quantity = Math.max(
        1,
        Math.floor(this.toNumber(oldItem.quantity || 1))
      );
      const subtotalCostAmount = this.toMoney(costPrice * quantity);
      const grossProfitAmount = this.toMoney(
        this.toMoney(oldItem.subtotalAmount) - subtotalCostAmount
      );
      await this.crmQuoteOrderItemEntity.update(
        { id },
        {
          costPrice,
          subtotalCostAmount,
          grossProfitAmount,
          costStatus: 1,
          costUserId: scope.userId,
          costTime: this.now(),
        }
      );
    }

    await this.crmQuoteOrderDepartmentAuditEntity.update(
      { id: audit.id },
      {
        costStatus: 1,
        costUserId: scope.userId,
        costTime: this.now(),
      }
    );
    await this.refreshOrderSummary(order.id);
    await this.refreshDepartmentAuditFlow(order.id);
  }

  async sendQuote(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    this.ensureCanSendQuote(order, scope);

    const sendType = Number(param?.sendType) === 1 ? 1 : 2;
    let email = String(param?.email || '').trim();

    if (sendType === 1 && !email) {
      const customer = await this.crmCustomerInfoEntity.findOneBy({
        id: Number(order.customerId),
        isDeleted: 0,
      });
      email = String(customer?.email || '').trim();
      if (!email) {
        throw new CoolCommException('傳送郵件時必須填寫客戶信箱');
      }
    }

    const sendTime = this.now();
    const sendRemark = String(param?.remark || '').trim() || null;

    await this.crmQuoteOrderEntity.update(
      { id: order.id },
      {
        status: 5,
        sendType,
        sendEmail: email || null,
        sendUserId: scope.userId,
        sendTime,
        sendRemark,
      }
    );

    return {
      id: order.id,
      status: 5,
      sendTime,
      sendType,
      email: email || null,
    };
  }

  async uploadContract(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    this.ensureCanUploadContract(order, scope);

    const fileId = String(param?.fileId || '').trim();
    if (!fileId) {
      throw new CoolCommException('請先上傳合約檔案');
    }

    const fileName =
      String(param?.fileName || '').trim() || this.inferFileName(fileId);
    const contractTime = this.now();
    const contractRemark = String(param?.remark || '').trim() || null;

    await this.crmQuoteOrderEntity.update(
      { id: order.id },
      {
        status: 6,
        contractStatus: 1,
        contractFile: fileId,
        contractFileName: fileName || null,
        contractUploadUserId: scope.userId,
        contractUploadTime: contractTime,
        contractRemark,
        caseMeetingFlag: 1,
      }
    );

    return {
      id: order.id,
      status: 6,
      contractStatus: 1,
      contractFile: fileId,
      contractFileName: fileName || null,
      contractUploadTime: contractTime,
      caseMeetingFlag: 1,
    };
  }

  async caseMeetingScope() {
    const scope = await this.getScope();
    return {
      visible: this.canViewCaseMeeting(scope),
    };
  }

  async updateCaseMeeting(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    if (!(await this.canUpdateCaseMeeting(order, scope))) {
      throw new CoolCommException('當前報價單不允許修改案情會議狀態');
    }

    const caseMeetingFlag = Number(param?.caseMeetingFlag) === 0 ? 0 : 1;
    await this.crmQuoteOrderEntity.update(
      { id: order.id },
      {
        caseMeetingFlag,
        caseMeetingUpdateUserId: scope.userId,
        caseMeetingUpdateTime: this.now(),
      }
    );

    return {
      id: order.id,
      caseMeetingFlag,
    };
  }

  async receiptStages(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    this.ensureCanHandleReceipt(order, scope);

    const stages = await this.crmQuoteOrderStageEntity.find({
      where: { quoteOrderId: order.id, isDeleted: 0 },
      order: { sortNum: 'ASC', id: 'ASC' },
    });

    return {
      id: order.id,
      quoteNo: order.quoteNo,
      quoteName: order.quoteName,
      stages: stages.filter(item => this.toMoney(item.receiptAmount) < this.toMoney(item.amount)),
    };
  }

  async submitReceipt(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    this.ensureCanHandleReceipt(order, scope);

    const stageId = Number(param?.stageId || 0);
    if (!stageId) {
      throw new CoolCommException('缺少回款階段');
    }

    const stage = await this.crmQuoteOrderStageEntity.findOneBy({
      id: stageId,
      quoteOrderId: order.id,
      isDeleted: 0,
    });
    if (!stage) {
      throw new CoolCommException('付款階段不存在');
    }

    const receiptAmount = this.toMoney(param?.receiptAmount);
    if (receiptAmount <= 0) {
      throw new CoolCommException('鍥炴閲戦蹇呴』澶т簬 0');
    }
    const paidAmount = this.toMoney(stage.receiptAmount);
    const nextReceiptAmount = this.toMoney(paidAmount + receiptAmount);
    if (nextReceiptAmount > this.toMoney(stage.amount)) {
      throw new CoolCommException('回款金額不能超過付款階段金額');
    }

    await this.crmQuoteOrderStageEntity.update(
      { id: stage.id },
      {
        receiptAmount: nextReceiptAmount,
        receiptVoucher: String(param?.receiptVoucher || '').trim() || null,
        receiptTime: this.now(),
        receiptStatus: nextReceiptAmount >= this.toMoney(stage.amount) ? 1 : 0,
      }
    );

    await this.refreshOrderReceiptAndInvoiceStatus(order.id);

    return {
      id: order.id,
      stageId: stage.id,
      receiptAmount: nextReceiptAmount,
    };
  }

  async invoiceStages(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    this.ensureCanHandleInvoice(order, scope);

    const [stages, invoices] = await Promise.all([
      this.crmQuoteOrderStageEntity.find({
      where: { quoteOrderId: order.id, isDeleted: 0 },
      order: { sortNum: 'ASC', id: 'ASC' },
      }),
      this.crmQuoteInvoiceEntity.find({
        where: { quoteOrderId: order.id, isDeleted: 0 },
        order: { createTime: 'DESC', id: 'DESC' },
      }),
    ]);
    const invoiceByStageId = new Map<number, any>();
    const activeInvoiceByStageNo = new Map<number, any>();
    invoices.forEach(item => {
      const status = Number(item.status || 0);
      if (![1, 2].includes(status)) {
        return;
      }
      const stageId = Number(item.quoteStageId);
      if (stageId && !invoiceByStageId.has(stageId)) {
        invoiceByStageId.set(stageId, item);
      }
      const stageNo = Number(item.stageNo || 0);
      if (stageNo && !activeInvoiceByStageNo.has(stageNo)) {
        activeInvoiceByStageNo.set(stageNo, item);
      }
    });

    return {
      id: order.id,
      quoteNo: order.quoteNo,
      quoteName: order.quoteName,
      stages: this.decorateStagesWithInvoiceMeta(stages, invoices),
    };
  }

  private decorateStagesWithInvoiceMeta(stages: any[], invoices: any[]) {
    const invoiceByStageId = new Map<number, any>();
    const activeInvoiceByStageNo = new Map<number, any>();

    (invoices || []).forEach(item => {
      const status = Number(item.status || 0);
      if (![1, 2].includes(status)) {
        return;
      }
      const stageId = Number(item.quoteStageId || 0);
      if (stageId && !invoiceByStageId.has(stageId)) {
        invoiceByStageId.set(stageId, item);
      }
      const stageNo = Number(item.stageNo || 0);
      if (stageNo && !activeInvoiceByStageNo.has(stageNo)) {
        activeInvoiceByStageNo.set(stageNo, item);
      }
    });

    return (stages || []).map(item => {
      const invoiceRecord =
        invoiceByStageId.get(Number(item.id)) ||
        activeInvoiceByStageNo.get(Number(item.stageNo || 0)) ||
        null;
      const invoiceStatus = invoiceRecord
        ? Number(invoiceRecord.ecpayInvalidStatus) === 2 || invoiceRecord.voidTime
          ? 2
          : Number(invoiceRecord.status) === 2
            ? 3
            : 1
        : item.invoiceStatus;

      return {
        ...item,
        invoiceStatus,
        issuedInvoiceAmount:
          Number(invoiceStatus) === 3 ? this.toMoney(invoiceRecord?.amount) : 0,
        allowanceStatus: this.resolveInvoiceAllowanceMeta(invoiceRecord).status,
        allowanceNo: this.resolveInvoiceAllowanceMeta(invoiceRecord).no,
        allowanceAmount: this.resolveInvoiceAllowanceMeta(invoiceRecord).amount,
        allowanceTime: this.resolveInvoiceAllowanceMeta(invoiceRecord).time,
        invoiceProductName:
          invoiceRecord?.invoiceProductName || item.invoiceProductName,
        invoiceRecord,
      };
    });
  }

  private resolveInvoiceAllowanceMeta(invoiceRecord: any) {
    if (!invoiceRecord) {
      return {
        status: 0,
        no: '',
        amount: 0,
        time: '',
      };
    }
    const response = this.parseJsonObject(invoiceRecord?.ecpayInvalidResponse);
    const allowance = this.parseJsonObject(response?.allowance);
    if (!allowance || Number(allowance?.RtnCode || 0) !== 1) {
      return {
        status: 0,
        no: '',
        amount: 0,
        time: '',
      };
    }
    const issueAmount = this.parseJsonObject(
      allowance?.__crmIssueAmount || allowance?.['__crmIssueAmount']
    );
    return {
      status: 1,
      no: String(
        allowance?.AllowanceNo ||
          allowance?.IA_Allow_No ||
          allowance?.AllowNo ||
          ''
      ).trim(),
      amount: this.toMoney(
        issueAmount?.totalAmount ??
          issueAmount?.TotalAmount ??
          0
      ),
      time: String(
        allowance?.AllowanceDate ||
          allowance?.CreateTime ||
          invoiceRecord?.updateTime ||
          ''
      ).trim(),
    };
  }

  async applyInvoice(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    this.ensureCanHandleInvoice(order, scope);

    const stageId = Number(param?.stageId || 0);
    if (!stageId) {
      throw new CoolCommException('請選擇要開票的付款階段');
    }

    const stage = await this.crmQuoteOrderStageEntity.findOneBy({
      id: stageId,
      quoteOrderId: order.id,
      isDeleted: 0,
    });
    if (!stage) {
      throw new CoolCommException('開票階段不存在');
    }
    const existed = await this.nativeQuery(
      `
      SELECT id
      FROM crm_quote_invoice
      WHERE quoteOrderId = ?
        AND isDeleted = 0
        AND status IN (1, 2)
        AND IFNULL(ecpayInvalidStatus, 0) <> 2
        AND voidTime IS NULL
        AND (quoteStageId = ? OR stageNo = ?)
      LIMIT 1
      `,
      [order.id, stage.id, Number(stage.stageNo || 0)]
    );
    if (existed?.length) {
      throw new CoolCommException('同一付款階段已存在有效開票申請');
    }

    const allStages = await this.crmQuoteOrderStageEntity.find({
      where: { quoteOrderId: order.id, isDeleted: 0 },
      order: { sortNum: 'ASC', id: 'ASC' },
    });
    const currentIndex = allStages.findIndex(item => Number(item.id) === Number(stage.id));
    const previousInvoiceStages = allStages
      .slice(0, Math.max(0, currentIndex))
      .filter(item => this.toMoney(item.amount) > 0);
    if (previousInvoiceStages.some(item => Number(item.invoiceStatus) !== 3)) {
      throw new CoolCommException('上一張發票審核通過後才能申請下一張票');
    }

    const invoiceProductName =
      String(param?.invoiceProductName || '').trim() ||
      `${order.quoteName || order.quoteNo || '報價單'}${stage.stageName || `階段${stage.stageNo}`}款項`;
    const customer = await this.crmCustomerInfoEntity.findOneBy({
      id: Number(order.customerId),
      isDeleted: 0,
    });
    const invoice = await this.crmQuoteInvoiceEntity.save({
      invoiceNo: await this.generateInvoiceNo(),
      quoteOrderId: order.id,
      quoteStageId: stage.id,
      quoteNo: order.quoteNo,
      quoteName: order.quoteName,
      stageNo: stage.stageNo,
      stageName: stage.stageName,
      ratio: stage.ratio,
      amount: this.toMoney(stage.amount),
      invoiceProductName,
      seller: customer?.companyName || customer?.contactName || null,
      address: customer?.address || null,
      taxNumber: customer?.taxNumber || null,
      email: customer?.email || null,
      salesmanId: order.salesmanId || null,
      applyUserId: scope.userId,
      applyTime: this.now(),
      status: 1,
      autoSendEmail: Number(stage.autoSendEmail) === 0 ? 0 : 1,
      scheduledSendTime: stage.invoiceDate
        ? `${String(stage.invoiceDate).slice(0, 10)} 12:00:00`
        : null,
      sendStatus: 0,
      sentTime: null,
      sendError: null,
      isDeleted: 0,
    });

    await this.crmQuoteOrderStageEntity.update(
      { id: stage.id },
      {
        invoiceProductName,
        invoiceStatus: 1,
        invoiceApplyTime: this.now(),
        invoiceVoidTime: null,
      }
    );

    await this.refreshOrderReceiptAndInvoiceStatus(order.id);

    return {
      id: order.id,
      stageId: stage.id,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      invoiceStatus: 1,
    };
  }

  async voidInvoice(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    this.ensureCanHandleInvoice(order, scope);

    const stageId = Number(param?.stageId || 0);
    if (!stageId) {
      throw new CoolCommException('請選擇要作廢的付款階段');
    }

    const stage = await this.crmQuoteOrderStageEntity.findOneBy({
      id: stageId,
      quoteOrderId: order.id,
      isDeleted: 0,
    });
    if (!stage) {
      throw new CoolCommException('開票階段不存在');
    }

    const invoice = await this.crmQuoteInvoiceEntity.findOne({
      where: {
        quoteOrderId: order.id,
        status: 2,
        isDeleted: 0,
      },
      order: { id: 'DESC' },
    });
    const matchedInvoice =
      Number(invoice?.quoteStageId || 0) === Number(stage.id) ||
      Number(invoice?.stageNo || 0) === Number(stage.stageNo || 0)
        ? invoice
        : await this.crmQuoteInvoiceEntity
            .createQueryBuilder('invoice')
            .where('invoice.quoteOrderId = :quoteOrderId', { quoteOrderId: order.id })
            .andWhere('invoice.status = 2')
            .andWhere('invoice.isDeleted = 0')
            .andWhere('(invoice.quoteStageId = :stageId OR invoice.stageNo = :stageNo)', {
              stageId: stage.id,
              stageNo: Number(stage.stageNo || 0),
            })
            .orderBy('invoice.id', 'DESC')
            .getOne();
    if (!matchedInvoice) {
      throw new CoolCommException('只有審核通過的發票可以作廢');
    }
    if (!matchedInvoice.ecpayInvoiceNo) {
      throw new CoolCommException('該發票未取得綠界發票號碼，無法作廢');
    }
    if (Number(matchedInvoice.ecpayInvalidStatus) === 2 || matchedInvoice.voidTime) {
      await this.crmQuoteOrderStageEntity.update(
        { id: stage.id },
        {
          invoiceStatus: 2,
          invoiceVoidTime: matchedInvoice.voidTime || matchedInvoice.ecpayInvalidTime || this.now(),
        }
      );
      await this.refreshOrderReceiptAndInvoiceStatus(order.id);
      throw new CoolCommException('發票已作廢，請勿重複操作');
    }

    const lock = await this.crmQuoteInvoiceEntity
      .createQueryBuilder()
      .update(CrmQuoteInvoiceEntity)
      .set({
        ecpayInvalidStatus: 1,
        ecpayInvalidError: null,
      })
      .where('id = :id', { id: matchedInvoice.id })
      .andWhere('status = 2')
      .andWhere('(ecpayInvalidStatus IS NULL OR ecpayInvalidStatus NOT IN (1, 2))')
      .execute();
    if (!lock.affected) {
      throw new CoolCommException('發票作廢處理中，請稍後再試');
    }

    const invalidTime = this.now();
    const invalidReason = String(param?.reason || '').trim() || 'CRM發票作廢';
    let result: any = null;
    try {
      const ecpayConfig = await this.baseSysParamService.dataByKey('crmEcpayInvoice');
      const invoiceDates = this.buildEcpayInvalidInvoiceDateCandidates(matchedInvoice);
      if (!invoiceDates.length) {
        throw new CoolCommException('綠界發票日期為空，無法作廢');
      }
      let lastError: any = null;
      for (const invoiceDate of invoiceDates) {
        try {
          result = await this.crmEcpayInvoiceService.invalidB2bInvoice(
            ecpayConfig,
            {
              invoiceNumber: matchedInvoice.ecpayInvoiceNo,
              invoiceDate,
              reason: invalidReason,
            }
          );
          if (
            invoiceDate !== matchedInvoice.ecpayInvoiceDate &&
            this.normalizeDateValue(invoiceDate) !==
              this.normalizeDateValue(matchedInvoice.ecpayInvoiceDate)
          ) {
            await this.crmQuoteInvoiceEntity.update(
              { id: matchedInvoice.id },
              { ecpayInvoiceDate: invoiceDate }
            );
          }
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (!this.isEcpayInvoiceNoOrDateError(error)) {
            throw error;
          }
        }
      }
      if (lastError) {
        throw lastError;
      }
    } catch (e) {
      const message = e.message || String(e);
      await this.crmQuoteInvoiceEntity.update(
        { id: matchedInvoice.id },
        {
          ecpayInvalidStatus: 3,
          ecpayInvalidError: message.slice(0, 1000),
        }
      );
      throw e;
    }

    await this.crmQuoteOrderStageEntity.update(
      { id: stage.id },
      {
        invoiceStatus: 2,
        invoiceVoidTime: invalidTime,
      }
    );
    await this.crmQuoteInvoiceEntity.update(
      { id: matchedInvoice.id },
      {
        voidTime: invalidTime,
        ecpayInvalidStatus: 2,
        ecpayInvalidTime: invalidTime,
        ecpayInvalidReason: invalidReason.slice(0, 255),
        ecpayInvalidError: null,
        ecpayInvalidResponse: JSON.stringify(result || {}),
      }
    );

    await this.refreshOrderReceiptAndInvoiceStatus(order.id);

    return {
      id: order.id,
      stageId: stage.id,
      invoiceStatus: 2,
    };
  }

  async copyCreate(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    const quoteNoPrefix = await this.getQuoteNoPrefix(
      Number(order.salesmanId || 0)
    );

    const [items, stages] = await Promise.all([
      this.crmQuoteOrderItemEntity.find({
        where: { quoteOrderId: order.id, isDeleted: 0 },
        order: { sortNum: 'ASC', id: 'ASC' },
      }),
      this.crmQuoteOrderStageEntity.find({
        where: { quoteOrderId: order.id, isDeleted: 0 },
        order: { sortNum: 'ASC', id: 'ASC' },
      }),
    ]);

    const copiedItems = items.map((item, index) => ({
      productId: item.productId,
      departmentId: item.departmentId,
      specId: item.specId,
      productName: item.productName,
      specName: item.specName,
      productType: item.productType,
      actualPrice: item.actualPrice,
      costPrice: item.costPrice,
      quantity: item.quantity,
      subtotalAmount: item.subtotalAmount,
      subtotalCostAmount: item.subtotalCostAmount,
      grossProfitAmount: item.grossProfitAmount,
      defaultRemark: item.defaultRemark,
      sourceDefaultRemark: item.sourceDefaultRemark,
      remark: item.remark,
      sortNum: index + 1,
      isDeleted: 0,
    }));
    const customer = await this.crmCustomerInfoEntity.findOneBy({
      id: Number(order.customerId || 0),
      isDeleted: 0,
    });
    const discountRate = this.toRatePercent(order.discountRate);
    const discountAudit = customer
      ? await this.resolveDiscountAudit(customer, discountRate)
      : { required: false, reason: '' };

    const saved = await this.crmQuoteOrderEntity.save({
      quoteNo: await this.generateQuoteNoSeed(),
      customerId: order.customerId,
      quoteName: `${order.quoteName || ''}`.trim(),
      quoteType: order.quoteType,
      salesmanId: order.salesmanId,
      accompanySalesmanId: order.accompanySalesmanId || null,
      bankAccountId: order.bankAccountId || null,
      currentAssigneeId: null,
      status: 1,
      auditStatus: 0,
      auditUserId: null,
      auditTime: null,
      auditRemark: null,
      assignStatus: 0,
      assignUserId: null,
      assignTime: null,
      assignRemark: null,
      contractStatus: 0,
      invoiceStatus: 0,
      receiptStatus: 0,
      paymentStatus: 0,
      startDate: order.startDate,
      endDate: order.endDate,
      finalAmount: order.finalAmount,
      costAmount: order.costAmount,
      grossProfitAmount: order.grossProfitAmount,
      grossProfitRate: order.grossProfitRate,
      discountDeductionAmount: 0,
      discountRate,
      commission: order.commission,
      discountAuditStatus: discountAudit.required ? 1 : 0,
      discountAuditReason: discountAudit.reason || null,
      discountAuditUserId: null,
      discountAuditTime: null,
      discountAuditRemark: null,
      sendType: 0,
      sendEmail: null,
      sendUserId: null,
      sendTime: null,
      sendRemark: null,
      contractFile: null,
      contractFileName: null,
      contractUploadUserId: null,
      contractUploadTime: null,
      contractRemark: null,
      caseMeetingFlag: 1,
      caseMeetingUpdateUserId: null,
      caseMeetingUpdateTime: null,
      remark: order.remark,
      isDeleted: 0,
    });
    saved.quoteNo = await this.assignSavedQuoteNo(
      saved.id,
      saved.createTime,
      quoteNoPrefix
    );

    await this.saveItems(saved.id, copiedItems);

    await this.saveStages(
      saved.id,
      stages.map((item, index) => ({
        stageNo: index + 1,
        stageName: item.stageName,
        ratio: item.ratio,
        amount: item.amount,
        invoiceDate: item.invoiceDate,
        expectedReceiptDate: item.expectedReceiptDate,
        needManualInvoice: item.needManualInvoice,
        autoSendEmail: Number(item.autoSendEmail) === 0 ? 0 : 1,
        remark: item.remark,
        sortNum: index + 1,
        isDeleted: 0,
      }))
    );
    await this.syncDepartmentAudits(saved.id, copiedItems);
    await this.saveQuoteHistory(saved.id);

    return {
      id: saved.id,
      quoteNo: saved.quoteNo,
    };
  }

  async quoteHistories(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope);
    const rows = await this.crmQuoteOrderHistoryEntity.find({
      where: { quoteOrderId: order.id, isDeleted: 0 },
      order: { createTime: 'DESC', stageNo: 'ASC', id: 'DESC' },
    });
    return {
      id: order.id,
      quoteNo: order.quoteNo,
      quoteName: order.quoteName,
      list: rows,
    };
  }

  async quoteHistoryDetail(param: any) {
    const scope = await this.getScope();
    const history = await this.crmQuoteOrderHistoryEntity.findOneBy({
      id: Number(param?.id || 0),
      isDeleted: 0,
    });
    if (!history) {
      throw new CoolCommException('報價單歷史記錄不存在');
    }
    const order = await this.getOrderById(Number(history.quoteOrderId || 0), scope);
    const customer = await this.crmCustomerInfoEntity.findOneBy({
      id: Number(order.customerId || 0),
      isDeleted: 0,
    });
    const duty = await this.baseSysParamService.dataByKey('duty');
    const quoteTerms = this.getOrderQuoteTerms(order);
    const partyB = this.applyQuoteCompanySealByAudit(
      await this.quotePartyB(order?.salesmanId, order?.bankAccountId),
      order
    );
    const paymentCondition = this.renderQuotePaymentCondition(
      await this.quotePaymentCondition(),
      order,
      history
    );
    return {
      ...history,
      customer,
      duty,
      quoteTerms,
      partyB,
      paymentCondition,
    };
  }

  async downloadContract(param: any) {
    const scope = await this.getScope();
    const order = await this.getOrderById(Number(param?.id || 0), scope, {
      allowFinanceRead: true,
    });
    const contractFile = String(order.contractFile || '').trim();
    if (!contractFile) {
      throw new CoolCommException('暫無合約檔案可下載');
    }

    const filePath = this.resolveLocalUploadFilePath(contractFile);
    const fileName = this.safeFileName(
      String(order.contractFileName || '').trim() ||
        this.inferFileName(contractFile) ||
        '合約檔案'
    );

    return {
      buffer: fs.readFileSync(filePath),
      fileName,
    };
  }

  async quoteTerms() {
    const value = await this.baseSysParamService.dataByKey('quote_terms');
    const sections = this.normalizeQuoteTermSections(value);
    return sections.length > 0 ? sections : this.loadQuoteTemplateTermSections();
  }

  async quoteDiscountRate() {
    return await this.getQuoteDiscountThreshold();
  }

  async quotePaymentCondition() {
    const value = await this.baseSysParamService.dataByKey(
      'quote_payment_condition'
    );
    return this.normalizeQuotePaymentCondition(value);
  }

  async quotePartyB(salesmanId?: number, bankAccountId?: number) {
    const value = await this.baseSysParamService.dataByKey('quote_party_b');
    const bankCover = await this.baseSysParamService.dataByKey('quote_bank_cover');
    const companySeal = await this.baseSysParamService.dataByKey('quote_company_seal');
    let partyB = this.normalizeQuotePartyB(value, bankCover, companySeal);
    partyB = await this.applyBankAccountToQuotePartyB(partyB, bankAccountId);
    return this.applySalesmanToQuotePartyB(partyB, salesmanId);
  }

  /**
   * 乙方聯絡人 / 信箱 / 電話改為對應報價單業務員資訊
   */
  private async applySalesmanToQuotePartyB(partyB: any, salesmanId?: number) {
    const id = Number(salesmanId || 0);
    if (!id) {
      return partyB;
    }
    const salesman = await this.baseSysUserEntity.findOneBy({ id });
    if (!salesman) {
      return partyB;
    }
    const contactName = String(
      salesman.name || salesman.nickName || salesman.username || ''
    ).trim();
    const email = String(salesman.email || '').trim();
    const mobile = String(salesman.phone || '').trim();
    return {
      ...partyB,
      contactName: contactName || partyB.contactName,
      email: email || partyB.email,
      mobile: mobile || partyB.mobile,
    };
  }

  /**
   * 按報價單選擇的存摺帳戶覆蓋乙方匯款資訊
   */
  private async applyBankAccountToQuotePartyB(
    partyB: any,
    bankAccountId?: number
  ) {
    let account = await this.crmQuoteBankAccountService.getById(bankAccountId);
    if (!account || Number(account.isEnabled) !== 1) {
      account = await this.crmQuoteBankAccountService.getDefaultAccount();
    }
    if (!account) {
      return partyB;
    }
    return {
      ...partyB,
      bankAccountName:
        String(account.bankAccountName || '').trim() || partyB.bankAccountName,
      bankCode: String(account.bankCode || '').trim() || partyB.bankCode,
      bankName: String(account.bankName || '').trim() || partyB.bankName,
      bankBranch: String(account.bankBranch || '').trim(),
      bankAccountNo:
        String(account.bankAccountNo || '').trim() || partyB.bankAccountNo,
      bankCoverUrl:
        String(account.bankCoverUrl || '').trim() || partyB.bankCoverUrl,
      bankAccountId: account.id,
      bankAccountLabel: account.name,
    };
  }

  private async normalizeBankAccountId(value: any) {
    const id = Number(value || 0);
    if (!id) {
      const defaultAccount =
        await this.crmQuoteBankAccountService.getDefaultAccount();
      return defaultAccount?.id || null;
    }
    const account = await this.crmQuoteBankAccountService.getById(id);
    if (!account || Number(account.isEnabled) !== 1) {
      throw new CoolCommException('存摺帳戶不存在或已停用');
    }
    return account.id;
  }

  private getOrderQuoteTerms(order: any) {
    const sections = this.normalizeQuoteTermSections(order?.quoteTerms);
    return sections.length > 0 ? sections : [];
  }

  private normalizeQuotePaymentCondition(value: any) {
    if (Array.isArray(value)) {
      return value.map(item => String(item || '').trim()).filter(Boolean).join('\n');
    }
    if (value && typeof value === 'object') {
      const text = value.text ?? value.content ?? value.value;
      if (text !== undefined && text !== null) {
        return String(text || '').trim() || this.DEFAULT_QUOTE_PAYMENT_CONDITION;
      }
    }
    const text = String(value || '').trim();
    return text || this.DEFAULT_QUOTE_PAYMENT_CONDITION;
  }

  private normalizeQuotePartyB(value: any, bankCover?: any, companySeal?: any) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const result = {
      ...this.DEFAULT_QUOTE_PARTY_B,
      ...source,
    };
    Object.keys(result).forEach(key => {
      result[key] = String(result[key] ?? '').trim();
    });
    const bankCoverUrl = this.normalizeQuoteBankCover(bankCover);
    if (bankCoverUrl) {
      result.bankCoverUrl = bankCoverUrl;
    }
    const companySealUrl = this.normalizeQuoteFileParam(companySeal);
    if (companySealUrl) {
      result.companySealUrl = companySealUrl;
    }
    return result;
  }

  private normalizeQuoteBankCover(value: any) {
    return this.normalizeQuoteFileParam(value);
  }

  private normalizeQuoteFileParam(value: any) {
    if (Array.isArray(value)) {
      return String(value[0] || '').trim();
    }
    if (value && typeof value === 'object') {
      return String(value.url ?? value.path ?? value.value ?? '').trim();
    }
    return String(value || '').split(',')[0].trim();
  }

  private renderQuotePaymentCondition(template: any, order: any, history?: any) {
    const finalAmount = this.formatMoney(order?.finalAmount || history?.amount || 0);
    return this.normalizeQuotePaymentCondition(template)
      .replace(/\{\{\s*finalAmount\s*\}\}/g, finalAmount)
      .replace(/\{\s*finalAmount\s*\}/g, finalAmount)
      .replace(/\$\{\s*finalAmount\s*\}/g, finalAmount)
      .replace(/\{\{\s*amount\s*\}\}/g, finalAmount)
      .replace(/\{\s*amount\s*\}/g, finalAmount)
      .replace(/\$\{\s*amount\s*\}/g, finalAmount);
  }

  private async resolveQuoteTermsForSave(param: any, oldOrder?: any) {
    if (Object.prototype.hasOwnProperty.call(param || {}, 'quoteTerms')) {
      const sections = this.normalizeQuoteTermSections(param?.quoteTerms);
      return sections.length > 0 ? sections : null;
    }
    const oldSections = this.normalizeQuoteTermSections(oldOrder?.quoteTerms);
    if (oldSections.length > 0) {
      return oldSections;
    }
    const defaultSections = await this.quoteTerms();
    return defaultSections.length > 0 ? defaultSections : null;
  }

  async quoteHistoryPdf(param: any) {
    const scope = await this.getScope();
    const history = await this.crmQuoteOrderHistoryEntity.findOneBy({
      id: Number(param?.id || 0),
      isDeleted: 0,
    });
    if (!history) {
      throw new CoolCommException('報價單歷史記錄不存在');
    }

    const order = await this.getOrderById(
      Number(history.quoteOrderId || 0),
      scope
    );
    const customer = await this.crmCustomerInfoEntity.findOneBy({
      id: Number(order.customerId || 0),
      isDeleted: 0,
    });
    const duty = await this.baseSysParamService.dataByKey('duty');
    const quoteTerms = this.getOrderQuoteTerms(order);
    const partyB = this.applyQuoteCompanySealByAudit(
      await this.quotePartyB(order?.salesmanId, order?.bankAccountId),
      order
    );
    const paymentCondition = this.renderQuotePaymentCondition(
      await this.quotePaymentCondition(),
      order,
      history
    );
    const buffer = this.buildQuoteHistoryPdf(
      history,
      order,
      customer,
      duty,
      quoteTerms,
      partyB,
      paymentCondition
    );

    return {
      buffer,
      fileName: `${this.safeFileName(history.quoteNo || order.quoteNo || '報價單')}.pdf`,
    };
  }

  async nextNo() {
    return {
      quoteNo: '儲存後自動生成',
    };
  }

  private async getCustomerById(id: number, write = false) {
    if (!id) {
      throw new CoolCommException('客戶不能為空');
    }

    const row = await this.crmCustomerInfoEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('客戶不存在');
    }
    if (!row.salesmanId && !write) {
      throw new CoolCommException('客戶尚未分配業務員');
    }

    const scope = await this.getScope();
    if (
      !scope.isBoss &&
      Number(row.salesmanId || 0) > 0 &&
      Number(row.salesmanId || 0) !== scope.userId
    ) {
      throw new CoolCommException('當前無權限操作此客戶');
    }
    return row;
  }

  private async getOrderById(
    id: number,
    scope?: QuoteScope,
    options?: { allowFinanceRead?: boolean }
  ) {
    if (!id) {
      throw new CoolCommException('報價單不存在');
    }

    const row = await this.crmQuoteOrderEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('報價單不存在');
    }

    const currentScope = scope || (await this.getScope());
    if (options?.allowFinanceRead && currentScope.isFinance) {
      return row;
    }
    const hasDepartmentAccess =
      currentScope.isOfficeClerkManager &&
      (await this.hasOrderDepartmentAccess(row.id, currentScope));
    const hasAssigneeAccess =
      currentScope.isOfficeClerk &&
      (await this.hasOrderAssigneeAccess(row.id, currentScope));
    const hasDiscountAuditAccess =
      currentScope.hasDiscountAuditPerm &&
      Number(row.discountAuditStatus || 0) === 1 &&
      (!currentScope.isOfficeClerkManager || hasDepartmentAccess);
    if (
      currentScope.isOfficeClerkManager &&
      !currentScope.isBoss &&
      !hasDiscountAuditAccess &&
      !hasDepartmentAccess
    ) {
      throw new CoolCommException('當前無權限查看此報價單');
    }
    if (
      currentScope.isOfficeClerk &&
      Number(row.salesmanId || 0) !== Number(currentScope.userId || 0) &&
      Number(row.accompanySalesmanId || 0) !== Number(currentScope.userId || 0) &&
      !hasDiscountAuditAccess &&
      !hasAssigneeAccess &&
      Number(row.currentAssigneeId || 0) !== Number(currentScope.userId || 0)
    ) {
      throw new CoolCommException('當前無權限查看此報價單');
    }
    if (
      !this.canViewOrder(row, currentScope) &&
      !hasDepartmentAccess &&
      !hasDiscountAuditAccess &&
      !hasAssigneeAccess
    ) {
      throw new CoolCommException('當前無權限查看此報價單');
    }

    return row;
  }

  private async fetchOrderDetail(id: number) {
    const rows = await this.nativeQuery(
      `
      SELECT
        a.*,
        c.companyName AS customerCompanyName,
        c.address AS customerAddress,
        c.taxNumber AS customerTaxNumber,
        c.remittanceLast5 AS customerRemittanceLast5,
        c.contactName AS customerContactName,
        c.mobile AS customerMobile,
        c.email AS customerEmail,
        c.isVip AS customerIsVip,
        u.name AS salesmanName,
        u2.name AS currentAssigneeName,
        u3.name AS accompanySalesmanName,
        u4.name AS auditUserName,
        u5.name AS assignUserName,
        u6.name AS sendUserName,
        u7.name AS contractUploadUserName
        FROM crm_quote_order a
        LEFT JOIN crm_customer_info c ON c.id = a.customerId
        LEFT JOIN base_sys_user u ON u.id = a.salesmanId
        LEFT JOIN base_sys_user u2 ON u2.id = a.currentAssigneeId
        LEFT JOIN base_sys_user u3 ON u3.id = a.accompanySalesmanId
        LEFT JOIN base_sys_user u4 ON u4.id = a.auditUserId
        LEFT JOIN base_sys_user u5 ON u5.id = a.assignUserId
        LEFT JOIN base_sys_user u6 ON u6.id = a.sendUserId
        LEFT JOIN base_sys_user u7 ON u7.id = a.contractUploadUserId
        WHERE a.id = ? AND a.isDeleted = 0
        LIMIT 1
      `,
      [id]
    );
    return rows?.[0] || null;
  }

  private async normalizeItems(items: any[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new CoolCommException('報價明細不能為空');
    }

    const productIds = items
      .map(item => Number(item?.productId))
      .filter(id => !Number.isNaN(id) && id > 0);

    if (productIds.length === 0) {
      throw new CoolCommException('報價明細缺少產品');
    }

    const specIds = items
      .map(item => Number(item?.specId))
      .filter(id => !Number.isNaN(id) && id > 0);

    const [products, specs] = await Promise.all([
      this.productInfoEntity.findBy({
        id: In(productIds),
        isDeleted: 0,
      }),
      specIds.length > 0
        ? this.productSpecEntity.findBy({
            id: In(specIds),
            isDeleted: 0,
          })
        : Promise.resolve([]),
    ]);

    const productMap = new Map<number, ProductInfoEntity>();
    const specMap = new Map<number, ProductSpecEntity>();

    for (const product of products) {
      productMap.set(Number(product.id), product);
    }
    for (const spec of specs) {
      specMap.set(Number(spec.id), spec);
    }

    return items.map((item, index) => {
      const productId = Number(item?.productId);
      const specId = this.toNullableNumber(item?.specId);
      const product = productMap.get(productId);
      if (!product) {
        throw new CoolCommException('報價明細中的產品不存在');
      }

      const spec = specId ? specMap.get(specId) : null;
      if (spec && Number(spec.productId || 0) !== productId) {
        throw new CoolCommException('產品規格與產品不匹配');
      }

      const actualPrice = this.toMoney(
        item?.actualPrice ?? spec?.price ?? product.price
      );
      const costPrice = this.toMoney(spec?.costPrice ?? product.costPrice);
      const presetPrice = this.toMoney(spec?.price ?? product.price);
      const minActualPrice = this.getMinActualPrice(presetPrice);
      if (actualPrice <= 0) {
        throw new CoolCommException(`第${index + 1}條產品報價價格必須大於0`);
      }
      if (minActualPrice > 0 && actualPrice <= minActualPrice) {
        throw new CoolCommException(
          `第${index + 1}條產品報價價格必須高於預設價格85%`
        );
      }
      const quantity = Math.max(
        1,
        Math.floor(this.toNumber(item?.quantity || 1))
      );
      const subtotalAmount = this.toMoney(actualPrice * quantity);
      const subtotalCostAmount = this.toMoney(costPrice * quantity);
      const grossProfitAmount = this.toMoney(
        subtotalAmount - subtotalCostAmount
      );

      let productType = Number(item?.productType || 0);
      if (![1, 2, 3].includes(productType)) {
        productType = Number(product.isOneTimePayment) === 1 ? 2 : 1;
      }

      const sourceDefaultRemark = Object.prototype.hasOwnProperty.call(
        item || {},
        'sourceDefaultRemark'
      )
        ? String(item?.sourceDefaultRemark ?? '').trim()
        : String(product.defaultRemark || '').trim();
      const defaultRemark = Object.prototype.hasOwnProperty.call(
        item || {},
        'defaultRemark'
      )
        ? String(item?.defaultRemark ?? '').trim()
        : sourceDefaultRemark;

      return {
        productId,
        departmentId: product.departmentId
          ? Number(product.departmentId)
          : null,
        specId,
        productName: String(product.name || '').trim(),
        specName: spec ? String(spec.name || '').trim() : '',
        productType,
        actualPrice,
        costPrice,
        quantity,
        subtotalAmount,
        subtotalCostAmount,
        grossProfitAmount,
        defaultRemark: defaultRemark || null,
        sourceDefaultRemark: sourceDefaultRemark || null,
        remark: String(item?.remark || '').trim() || null,
        sortNum: index + 1,
        isDeleted: 0,
      };
    });
  }

  private normalizeStages(stages: any[], finalAmount: number) {
    const source =
      Array.isArray(stages) && stages.length > 0
        ? stages
        : [
            {
              stageName: '第一階段',
              ratio: 1,
              amount: finalAmount,
              needManualInvoice: 0,
              autoSendEmail: 1,
            },
          ];

    return source.map((item, index) => {
      let ratio = this.normalizeRate(item?.ratio);
      let amount = this.toMoney(item?.amount);

      if (amount <= 0 && ratio > 0 && finalAmount > 0) {
        amount = this.toMoney(finalAmount * ratio);
      }
      if (ratio <= 0 && amount > 0 && finalAmount > 0) {
        ratio = this.toNumber(amount / finalAmount);
      }
      if (ratio <= 0) {
        throw new CoolCommException(`第${index + 1}個付款階段比例必須大於0`);
      }

      return {
        id: Number(item?.id || 0) || undefined,
        stageNo: index + 1,
        stageName: String(item?.stageName || `階段${index + 1}`).trim(),
        ratio: this.toNumber(ratio),
        amount: this.toMoney(amount),
        invoiceDate: this.normalizeDateTime(item?.invoiceDate),
        expectedReceiptDate: this.normalizeDateTime(item?.expectedReceiptDate),
        needManualInvoice: Number(item?.needManualInvoice) === 1 ? 1 : 0,
        autoSendEmail: Number(item?.autoSendEmail) === 0 ? 0 : 1,
        receiptAmount: 0,
        receiptVoucher: null,
        receiptTime: null,
        receiptStatus: 0,
        invoiceProductName: null,
        invoiceStatus: 0,
        invoiceApplyTime: null,
        invoiceVoidTime: null,
        remark: String(item?.remark || '').trim() || null,
        sortNum: index + 1,
        isDeleted: 0,
      };
    });
  }

  private async buildStagePersistList(quoteOrderId: number, stages: any[]) {
    const existingStages = quoteOrderId
      ? await this.crmQuoteOrderStageEntity.find({
          where: { quoteOrderId, isDeleted: 0 },
          order: { sortNum: 'ASC', id: 'ASC' },
        })
      : [];

    const existingStageById = new Map<number, CrmQuoteOrderStageEntity>();
    const existingStageByStageNo = new Map<number, CrmQuoteOrderStageEntity>();
    existingStages.forEach(item => {
      const stageId = Number(item.id || 0);
      const stageNo = Number(item.stageNo || 0);
      if (stageId > 0) {
        existingStageById.set(stageId, item);
      }
      if (stageNo > 0 && !existingStageByStageNo.has(stageNo)) {
        existingStageByStageNo.set(stageNo, item);
      }
    });

    return (Array.isArray(stages) ? stages : []).map(item => {
      const currentId = Number(item?.id || 0);
      const currentStageNo = Number(item?.stageNo || 0);
      const previousStage =
        (currentId > 0 ? existingStageById.get(currentId) : null) ||
        (currentStageNo > 0 ? existingStageByStageNo.get(currentStageNo) : null) ||
        null;

      return {
        ...item,
        receiptAmount: this.toMoney(
          previousStage?.receiptAmount ?? item?.receiptAmount ?? 0
        ),
        receiptVoucher:
          previousStage?.receiptVoucher ??
          (String(item?.receiptVoucher || '').trim() || null),
        receiptTime: previousStage?.receiptTime ?? item?.receiptTime ?? null,
        receiptStatus: Number(
          previousStage?.receiptStatus ?? item?.receiptStatus ?? 0
        ),
        invoiceProductName:
          previousStage?.invoiceProductName ??
          (String(item?.invoiceProductName || '').trim() || null),
        invoiceStatus: Number(
          previousStage?.invoiceStatus ?? item?.invoiceStatus ?? 0
        ),
        invoiceApplyTime:
          previousStage?.invoiceApplyTime ?? item?.invoiceApplyTime ?? null,
        invoiceVoidTime:
          previousStage?.invoiceVoidTime ?? item?.invoiceVoidTime ?? null,
      };
    });
  }

  private calcSummary(items: any[]) {
    const finalAmount = this.toMoney(
      items.reduce((sum, item) => sum + this.toNumber(item?.subtotalAmount), 0)
    );
    const costAmount = this.toMoney(
      items.reduce(
        (sum, item) => sum + this.toNumber(item?.subtotalCostAmount),
        0
      )
    );
    const grossProfitAmount = this.toMoney(finalAmount - costAmount);
    const grossProfitRate =
      finalAmount > 0 ? this.toNumber(grossProfitAmount / finalAmount) : 0;

    return {
      finalAmount,
      costAmount,
      grossProfitAmount,
      grossProfitRate: this.toNumber(grossProfitRate),
    };
  }

  private resolveSummary(param: any, fallback: any) {
    const finalAmount = this.pickMoneyValue(
      param?.finalAmount,
      fallback.finalAmount
    );
    const costAmount = this.pickMoneyValue(
      param?.costAmount,
      fallback.costAmount
    );
    const grossProfitAmount = this.pickMoneyValue(
      param?.grossProfitAmount,
      this.toMoney(finalAmount - costAmount)
    );
    const grossProfitRate =
      finalAmount > 0
        ? this.pickNumberValue(
            param?.grossProfitRate,
            this.toNumber(grossProfitAmount / finalAmount)
          )
        : 0;

    return {
      finalAmount,
      costAmount,
      grossProfitAmount,
      grossProfitRate: this.toNumber(grossProfitRate),
    };
  }

  private async saveItems(quoteOrderId: number, items: any[]) {
    if (!quoteOrderId || items.length === 0) {
      return;
    }
    await this.crmQuoteOrderItemEntity.save(
      items.map(item => ({
        ...item,
        quoteOrderId,
      }))
    );
  }

  private async saveStages(quoteOrderId: number, stages: any[]) {
    if (!quoteOrderId || stages.length === 0) {
      return;
    }
    const persistStages = await this.buildStagePersistList(quoteOrderId, stages);
    await this.crmQuoteOrderStageEntity.save(
      persistStages.map(item => ({
        ...item,
        quoteOrderId,
      }))
    );
  }

  private async replaceItems(quoteOrderId: number, items: any[]) {
    await this.crmQuoteOrderItemEntity.update(
      { quoteOrderId },
      { isDeleted: 1 }
    );
    await this.saveItems(quoteOrderId, items);
  }

  private async replaceStages(quoteOrderId: number, stages: any[]) {
    await this.crmQuoteOrderStageEntity.update(
      { quoteOrderId },
      { isDeleted: 1 }
    );
    await this.saveStages(quoteOrderId, stages);
  }

  private buildAllowanceDecisionSummary(
    rawStages: any[],
    normalizedStages: any[],
    invoices: CrmQuoteInvoiceEntity[]
  ) {
    const rawStageList = Array.isArray(rawStages) ? rawStages : [];
    const stageList =
      rawStageList.length > 0 ? rawStageList : Array.isArray(normalizedStages) ? normalizedStages : [];
    const invoiceList = Array.isArray(invoices) ? invoices : [];
    const uninvoicedAmount = this.toMoney(
      stageList
        .filter(item => Number(item?.invoiceStatus || 0) !== 3)
        .reduce((sum, item) => sum + this.toNumber(item?.amount), 0)
    );
    const modifiedStageTotalAmount = this.toMoney(
      stageList.reduce((sum, item) => sum + this.toNumber(item?.amount), 0)
    );
    const expectedIssuedInvoiceAmount = this.toMoney(
      modifiedStageTotalAmount - uninvoicedAmount
    );
    const appliedInvoiceAmount = this.toMoney(
      invoiceList.reduce((sum, item) => sum + this.toNumber(item?.amount), 0)
    );
    const allowanceTotalAmount = this.toMoney(
      Math.max(0, appliedInvoiceAmount - expectedIssuedInvoiceAmount)
    );
    return {
      modifiedStageTotalAmount,
      uninvoicedAmount,
      expectedIssuedInvoiceAmount,
      appliedInvoiceAmount,
      allowanceTotalAmount,
      action:
        expectedIssuedInvoiceAmount > appliedInvoiceAmount
          ? 'voidAndReissue'
          : 'allowance',
    };
  }

  private async executeAllowanceInvoiceStrategy(
    order: any,
    decision: any,
    invoices: CrmQuoteInvoiceEntity[],
    stages: any[]
  ) {
    const invoiceList = Array.isArray(invoices) ? invoices : [];
    if (invoiceList.length === 0) {
      return;
    }

    if (decision.action === 'voidAndReissue') {
      for (const invoice of invoiceList) {
        await this.voidHistoricalInvoice(invoice, '申請折讓後重新開票');
      }
      await this.rebuildInvoiceApplications(order, stages, invoiceList);
      return;
    }

    const allowanceDistributions = this.buildAllowanceDistributions(
      invoiceList,
      decision.allowanceTotalAmount
    );
    for (const item of allowanceDistributions) {
      if (this.toMoney(item.amount) <= 0) {
        continue;
      }
      await this.allowanceHistoricalInvoice(item.invoice, item.amount, '申請折讓');
    }
  }

  private buildAllowanceDistributions(
    invoices: CrmQuoteInvoiceEntity[],
    allowanceTotalAmount: number
  ) {
    const invoiceList = Array.isArray(invoices) ? invoices : [];
    const totalAllowanceCents = this.toCent(allowanceTotalAmount);
    if (invoiceList.length === 0 || totalAllowanceCents <= 0) {
      return [];
    }

    const invoiceMetaList = invoiceList
      .map((invoice, index) => ({
        invoice,
        index,
        amountCents: this.toCent(invoice.amount),
      }))
      .filter(item => item.amountCents > 0);

    const issuedTotalCents = invoiceMetaList.reduce(
      (sum, item) => sum + item.amountCents,
      0
    );
    if (issuedTotalCents <= 0) {
      return [];
    }

    const baseRows = invoiceMetaList.map(item => {
      const rawShare = (totalAllowanceCents * item.amountCents) / issuedTotalCents;
      const cents = Math.floor(rawShare);
      return {
        ...item,
        cents,
        remainder: rawShare - cents,
      };
    });

    let remainingCents =
      totalAllowanceCents -
      baseRows.reduce((sum, item) => sum + item.cents, 0);

    baseRows
      .sort((a, b) => {
        if (b.remainder !== a.remainder) {
          return b.remainder - a.remainder;
        }
        return a.index - b.index;
      })
      .forEach(item => {
        if (remainingCents <= 0) {
          return;
        }
        if (item.cents >= item.amountCents) {
          return;
        }
        item.cents += 1;
        remainingCents -= 1;
      });

    return baseRows
      .sort((a, b) => a.index - b.index)
      .map(item => ({
        invoice: item.invoice,
        amount: this.toMoney(item.cents / 100),
      }));
  }

  private async voidHistoricalInvoice(
    invoice: CrmQuoteInvoiceEntity,
    reason: string
  ) {
    if (!invoice.ecpayInvoiceNo) {
      throw new CoolCommException('歷史發票缺少綠界發票號碼，無法作廢');
    }
    if (Number(invoice.ecpayInvalidStatus || 0) === 2 || invoice.voidTime) {
      return;
    }

    const invalidTime = this.now();
    const invalidReason = String(reason || 'CRM發票作廢').trim() || 'CRM發票作廢';
    const lock = await this.crmQuoteInvoiceEntity
      .createQueryBuilder()
      .update(CrmQuoteInvoiceEntity)
      .set({
        ecpayInvalidStatus: 1,
        ecpayInvalidError: null,
      })
      .where('id = :id', { id: invoice.id })
      .andWhere('status = 2')
      .andWhere('(ecpayInvalidStatus IS NULL OR ecpayInvalidStatus NOT IN (1, 2))')
      .execute();
    if (!lock.affected) {
      return;
    }

    let result: any = null;
    try {
      const ecpayConfig = await this.baseSysParamService.dataByKey('crmEcpayInvoice');
      const invoiceDates = this.buildEcpayInvalidInvoiceDateCandidates(invoice);
      if (!invoiceDates.length) {
        throw new CoolCommException('綠界發票日期為空，無法作廢');
      }
      let lastError: any = null;
      for (const invoiceDate of invoiceDates) {
        try {
          result = await this.crmEcpayInvoiceService.invalidB2bInvoice(ecpayConfig, {
            invoiceNumber: invoice.ecpayInvoiceNo,
            invoiceDate,
            reason: invalidReason,
          });
          if (
            invoiceDate !== invoice.ecpayInvoiceDate &&
            this.normalizeDateValue(invoiceDate) !==
              this.normalizeDateValue(invoice.ecpayInvoiceDate)
          ) {
            await this.crmQuoteInvoiceEntity.update(
              { id: invoice.id },
              { ecpayInvoiceDate: invoiceDate }
            );
          }
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (!this.isEcpayInvoiceNoOrDateError(error)) {
            throw error;
          }
        }
      }
      if (lastError) {
        throw lastError;
      }
    } catch (e) {
      await this.crmQuoteInvoiceEntity.update(
        { id: invoice.id },
        {
          ecpayInvalidStatus: 3,
          ecpayInvalidError: String(e?.message || e).slice(0, 1000),
        }
      );
      throw e;
    }

    await this.crmQuoteInvoiceEntity.update(
      { id: invoice.id },
      {
        voidTime: invalidTime,
        ecpayInvalidStatus: 2,
        ecpayInvalidTime: invalidTime,
        ecpayInvalidReason: invalidReason.slice(0, 255),
        ecpayInvalidError: null,
        ecpayInvalidResponse: JSON.stringify(result || {}),
      }
    );
  }

  private async allowanceHistoricalInvoice(
    invoice: CrmQuoteInvoiceEntity,
    amount: number,
    remark: string
  ) {
    if (!invoice.ecpayInvoiceNo) {
      throw new CoolCommException('歷史發票缺少綠界發票號碼，無法折讓');
    }
    if (Number(invoice.ecpayInvalidStatus || 0) === 2 || invoice.voidTime) {
      return;
    }

    const ecpayConfig = await this.baseSysParamService.dataByKey('crmEcpayInvoice');
    const invoiceDates = this.buildEcpayInvalidInvoiceDateCandidates(invoice);
    if (!invoiceDates.length) {
      throw new CoolCommException('綠界發票日期為空，無法折讓');
    }
    let result: any = null;
    let lastError: any = null;
    for (const invoiceDate of invoiceDates) {
      try {
        const historicalItemName =
          this.resolveHistoricalInvoiceProductName(invoice) ||
          invoice.invoiceProductName ||
          invoice.quoteName ||
          'CRM折讓';
        result = await this.crmEcpayInvoiceService.allowanceB2bInvoice(ecpayConfig, {
          invoiceNumber: invoice.ecpayInvoiceNo,
          invoiceDate,
          amount: this.toMoney(amount),
          itemName: historicalItemName,
          originalSequenceNumber: 1,
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (!this.isEcpayInvoiceNoOrDateError(error)) {
          throw error;
        }
      }
    }
    if (lastError) {
      throw lastError;
    }

    await this.crmQuoteInvoiceEntity.update(
      { id: invoice.id },
      {
        ecpayInvalidReason: String(remark || '申請折讓').slice(0, 255),
        ecpayInvalidResponse: JSON.stringify({
          ...(this.parseJsonObject(invoice.ecpayInvalidResponse) || {}),
          allowance: result || {},
        }),
      }
    );
  }

  private resolveHistoricalInvoiceProductName(invoice: CrmQuoteInvoiceEntity) {
    const issueResponse = this.parseJsonObject(invoice?.ecpayIssueResponse);
    const items = Array.isArray(issueResponse?.Items)
      ? issueResponse.Items
      : Array.isArray(issueResponse?.items)
        ? issueResponse.items
        : [];

    for (const item of items) {
      const itemName = String(item?.ItemName ?? item?.itemName ?? '').trim();
      if (itemName) {
        return itemName;
      }
    }

    return String(invoice?.invoiceProductName || '').trim() || '';
  }

  private async rebuildInvoiceApplications(
    order: any,
    stages: any[],
    oldInvoices: CrmQuoteInvoiceEntity[]
  ) {
    const currentStages = await this.crmQuoteOrderStageEntity.find({
      where: { quoteOrderId: Number(order.id), isDeleted: 0 },
      order: { sortNum: 'ASC', id: 'ASC' },
    });
    const issuedStageNos = Array.from(
      new Set(
        (oldInvoices || [])
          .map(item => Number(item.stageNo || 0))
          .filter(item => item > 0)
      )
    );

    for (const stageNo of issuedStageNos) {
      const stage = currentStages.find(item => Number(item.stageNo || 0) === stageNo);
      if (!stage || this.toMoney(stage.amount) <= 0) {
        continue;
      }
      const invoiceProductName =
        String(stage.invoiceProductName || '').trim() ||
        `${order.quoteName || order.quoteNo || '報價單'}${stage.stageName || `階段${stage.stageNo}`}款項`;
      const customer = await this.crmCustomerInfoEntity.findOneBy({
        id: Number(order.customerId),
        isDeleted: 0,
      });
      const invoice = await this.crmQuoteInvoiceEntity.save({
        invoiceNo: await this.generateInvoiceNo(),
        quoteOrderId: order.id,
        quoteStageId: stage.id,
        quoteNo: order.quoteNo,
        quoteName: order.quoteName,
        stageNo: stage.stageNo,
        stageName: stage.stageName,
        ratio: stage.ratio,
        amount: this.toMoney(stage.amount),
        invoiceProductName,
        seller: customer?.companyName || customer?.contactName || null,
        address: customer?.address || null,
        taxNumber: customer?.taxNumber || null,
        email: customer?.email || null,
        salesmanId: order.salesmanId || null,
        applyUserId: Number(this.ctx.admin?.userId || 0) || null,
        applyTime: this.now(),
        status: 1,
        autoSendEmail: Number(stage.autoSendEmail) === 0 ? 0 : 1,
        scheduledSendTime: stage.invoiceDate
          ? `${String(stage.invoiceDate).slice(0, 10)} 12:00:00`
          : null,
        sendStatus: 0,
        sentTime: null,
        sendError: null,
        isDeleted: 0,
      });

      await this.crmQuoteOrderStageEntity.update(
        { id: stage.id },
        {
          invoiceProductName,
          invoiceStatus: 1,
          invoiceApplyTime: this.now(),
          invoiceVoidTime: null,
        }
      );
    }
  }

  private parseJsonObject(value: any) {
    if (!value) {
      return null;
    }
    if (typeof value === 'object') {
      return value;
    }
    try {
      return JSON.parse(String(value));
    } catch {
      return null;
    }
  }

  private ensurePaymentStageOnlyUpdatePayload(param: any) {
    const allowedKeys = ['id', 'stages'];
    const extraKeys = Object.keys(param || {}).filter(
      key => !allowedKeys.includes(key) && param[key] !== undefined
    );
    if (extraKeys.length > 0) {
      throw new CoolCommException('內勤審核通過後僅允許修改付款階段');
    }
  }

  private async ensurePaymentStagesEditableAfterApproved(
    quoteOrderId: number
  ) {
    const rows = await this.nativeQuery(
      `
      SELECT
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS issuedCount
      FROM crm_quote_invoice
      WHERE quoteOrderId = ?
        AND isDeleted = 0
        AND status IN (1, 2)
        AND IFNULL(ecpayInvalidStatus, 0) <> 2
        AND voidTime IS NULL
    `,
      [quoteOrderId]
    );
    const pendingCount = Number(rows?.[0]?.pendingCount || 0);
    const issuedCount = Number(rows?.[0]?.issuedCount || 0);
    if (pendingCount > 0) {
      throw new CoolCommException(
        '尚有待審核的發票申請，請先處理後再修改付款階段'
      );
    }
    if (issuedCount > 0) {
      throw new CoolCommException(
        '如需修改付款階段，請先將已開立的發票全部作廢'
      );
    }
  }

  private async saveQuoteHistory(quoteOrderId: number) {
    const [order, items, stages] = await Promise.all([
      this.crmQuoteOrderEntity.findOneBy({ id: quoteOrderId, isDeleted: 0 }),
      this.crmQuoteOrderItemEntity.find({
        where: { quoteOrderId, isDeleted: 0 },
        order: { sortNum: 'ASC', id: 'ASC' },
      }),
      this.crmQuoteOrderStageEntity.find({
        where: { quoteOrderId, isDeleted: 0 },
        order: { sortNum: 'ASC', id: 'ASC' },
      }),
    ]);
    if (!order || stages.length === 0) {
      return;
    }
    await this.crmQuoteOrderHistoryEntity.save({
      quoteOrderId,
      quoteNo: order.quoteNo,
      quoteName: order.quoteName,
      stageNo: 0,
      stageName: '全部階段',
      amount: order.finalAmount,
      remark: order.remark,
      snapshot: {
        order,
        items,
        stages,
      },
      isDeleted: 0,
    });
  }

  private async syncDepartmentAudits(
    quoteOrderId: number,
    items: any[],
    options: { resetExisting?: boolean } = {}
  ) {
    const departmentIds = Array.from(
      new Set(
        items.map(item => Number(item?.departmentId || 0)).filter(id => id > 0)
      )
    );
    const oldRows = await this.crmQuoteOrderDepartmentAuditEntity.find({
      where: { quoteOrderId, isDeleted: 0 },
    });
    const oldMap = new Map(
      oldRows.map(item => [Number(item.departmentId), item])
    );

    for (const departmentId of departmentIds) {
      const old = oldMap.get(departmentId);
      if (old) {
        oldMap.delete(departmentId);
        if (options.resetExisting) {
          await this.crmQuoteOrderDepartmentAuditEntity.update(
            { id: old.id },
            {
              auditStatus: 1,
              auditUserId: null,
              auditTime: null,
              auditRemark: null,
              assignStatus: 0,
              assigneeId: null,
              assignUserId: null,
              assignTime: null,
              assignRemark: null,
              costStatus: 0,
              costUserId: null,
              costTime: null,
            }
          );
        }
        continue;
      }
      await this.crmQuoteOrderDepartmentAuditEntity.save({
        quoteOrderId,
        departmentId,
        auditStatus: 1,
        assignStatus: 0,
        costStatus: 0,
        isDeleted: 0,
      });
    }

    for (const old of oldMap.values()) {
      await this.crmQuoteOrderDepartmentAuditEntity.update(
        { id: old.id },
        { isDeleted: 1 }
      );
    }
  }

  private async fetchDepartmentAudits(quoteOrderId: number) {
    return this.nativeQuery(
      `
      SELECT
        a.*,
        d.name AS departmentName,
        au.name AS auditUserName,
        su.name AS assignUserName,
        assignee.name AS assigneeName,
        cu.name AS costUserName
      FROM crm_quote_order_department_audit a
      LEFT JOIN base_sys_department d ON d.id = a.departmentId
      LEFT JOIN base_sys_user au ON au.id = a.auditUserId
      LEFT JOIN base_sys_user su ON su.id = a.assignUserId
      LEFT JOIN base_sys_user assignee ON assignee.id = a.assigneeId
      LEFT JOIN base_sys_user cu ON cu.id = a.costUserId
      WHERE a.quoteOrderId = ?
        AND a.isDeleted = 0
      ORDER BY a.departmentId ASC, a.id ASC
    `,
      [quoteOrderId]
    );
  }

  private async hasOrderDepartmentAccess(orderId: number, scope: QuoteScope) {
    const rows = await this.nativeQuery(
      `
      SELECT COUNT(1) AS count
      FROM crm_quote_order q
      WHERE q.id = ?
        AND q.isDeleted = 0
        AND (
          EXISTS (
            SELECT 1
            FROM crm_quote_order_department_audit da
            WHERE da.quoteOrderId = q.id
              AND da.isDeleted = 0
              AND da.departmentId in (?)
          )
          OR EXISTS (
            SELECT 1
            FROM crm_quote_order_item qi
            WHERE qi.quoteOrderId = q.id
              AND qi.isDeleted = 0
              AND qi.departmentId in (?)
          )
        )
    `,
      [
        orderId,
        scope.departmentIds.length ? scope.departmentIds : [null],
        scope.departmentIds.length ? scope.departmentIds : [null],
      ]
    );
    return Number(rows?.[0]?.count || 0) > 0;
  }

  private async hasOrderAssigneeAccess(orderId: number, scope: QuoteScope) {
    const rows = await this.nativeQuery(
      `
      SELECT COUNT(1) AS count
      FROM crm_quote_order_department_audit
      WHERE quoteOrderId = ?
        AND isDeleted = 0
        AND assigneeId = ?
    `,
      [orderId, scope.userId]
    );
    return Number(rows?.[0]?.count || 0) > 0;
  }

  private async getDepartmentAudit(quoteOrderId: number, departmentId: number) {
    if (!quoteOrderId || !departmentId) {
      throw new CoolCommException('部門審核資料不存在');
    }
    const row = await this.crmQuoteOrderDepartmentAuditEntity.findOneBy({
      quoteOrderId,
      departmentId,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('部門審核資料不存在');
    }
    return row;
  }

  private async refreshOrderSummary(quoteOrderId: number) {
    const items = await this.crmQuoteOrderItemEntity.find({
      where: { quoteOrderId, isDeleted: 0 },
      order: { sortNum: 'ASC', id: 'ASC' },
    });
    const summary = this.calcSummary(items);
    await this.crmQuoteOrderEntity.update(
      { id: quoteOrderId },
      {
        costAmount: summary.costAmount,
        grossProfitAmount: summary.grossProfitAmount,
        grossProfitRate: summary.grossProfitRate,
      }
    );
  }

  private async refreshDepartmentAuditFlow(quoteOrderId: number) {
    const audits = await this.crmQuoteOrderDepartmentAuditEntity.find({
      where: { quoteOrderId, isDeleted: 0 },
    });
    if (!audits.length) {
      return;
    }

    if (audits.some(item => Number(item.auditStatus) === 3)) {
      await this.crmQuoteOrderEntity.update(
        { id: quoteOrderId },
        {
          status: 3,
          auditStatus: 3,
          assignStatus: 0,
          currentAssigneeId: null,
        }
      );
      return;
    }

    const allApproved = audits.every(item => Number(item.auditStatus) === 2);
    if (!allApproved) {
      await this.crmQuoteOrderEntity.update(
        { id: quoteOrderId },
        { status: 2, auditStatus: 1, assignStatus: 0 }
      );
      return;
    }

    const allAssigned = audits.every(item => Number(item.assignStatus) === 2);
    await this.crmQuoteOrderEntity.update(
      { id: quoteOrderId },
      {
        status: 4,
        auditStatus: 2,
        assignStatus: allAssigned ? 2 : 1,
        currentAssigneeId:
          audits.length === 1 && allAssigned ? audits[0].assigneeId : null,
      }
    );
  }

  private canAuditDepartment(audit: any, scope: QuoteScope) {
    return (
      scope.isOfficeClerkManager &&
      Number(audit.auditStatus || 0) === 1 &&
      this.canManageDepartment(Number(audit.departmentId || 0), scope)
    );
  }

  /**
   * 內勤主管分配：部門審核通過 + 待分配 + 業務已回傳合約
   */
  private canAssignDepartment(audit: any, order: any, scope: QuoteScope) {
    return (
      scope.isOfficeClerkManager &&
      Number(audit.auditStatus || 0) === 2 &&
      Number(audit.assignStatus || 0) === 1 &&
      Number(order?.contractStatus || 0) === 1 &&
      this.canManageDepartment(Number(audit.departmentId || 0), scope)
    );
  }

  /** 內勤審核通過後，下載/預覽報價單才蓋公司章 */
  private canShowQuoteCompanySeal(order: any) {
    return Number(order?.auditStatus || 0) === 2;
  }

  private applyQuoteCompanySealByAudit(partyB: any, order: any) {
    if (this.canShowQuoteCompanySeal(order)) {
      return partyB;
    }
    return {
      ...partyB,
      companySealUrl: '',
    };
  }

  private canSubmitDepartmentCost(audit: any, scope: QuoteScope) {
    return (
      (scope.isBoss ||
        ((scope.isOfficeClerk || scope.isOfficeClerkManager) &&
          Number(audit.assigneeId || 0) === Number(scope.userId || 0))) &&
      Number(audit.auditStatus || 0) === 2 &&
      Number(audit.assignStatus || 0) === 2
    );
  }

  private async generateQuoteNoSeed() {
    for (let i = 0; i < 10; i++) {
      const quoteNo = `TMP${moment().format('YYYYMMDDHHmmss')}${this.randomDigits(
        6
      )}`;
      const rows = await this.nativeQuery(
        'SELECT COUNT(1) AS count FROM crm_quote_order WHERE quoteNo = ?',
        [quoteNo]
      );
      if (Number(rows?.[0]?.count || 0) === 0) {
        return quoteNo;
      }
    }
    throw new CoolCommException('報價單編號生成失敗，請稍後再試');
  }

  private async assignSavedQuoteNo(
    orderId: number,
    createTime: any,
    quoteNoPrefix: string
  ) {
    const quoteNo = await this.buildSavedQuoteNo(
      orderId,
      createTime,
      quoteNoPrefix
    );
    await this.crmQuoteOrderEntity.update({ id: orderId }, { quoteNo });
    return quoteNo;
  }

  private async buildSavedQuoteNo(
    orderId: number,
    createTime: any,
    quoteNoPrefix: string
  ) {
    const quoteDate = moment(createTime || this.now());
    const dayStart = quoteDate
      .clone()
      .startOf('day')
      .format('YYYY-MM-DD HH:mm:ss');
    const dayEnd = quoteDate
      .clone()
      .add(1, 'day')
      .startOf('day')
      .format('YYYY-MM-DD HH:mm:ss');
    const rows = await this.nativeQuery(
      'SELECT COUNT(1) AS count FROM crm_quote_order WHERE createTime >= ? AND createTime < ? AND id <= ?',
      [dayStart, dayEnd, Number(orderId || 0)]
    );
    const sequence = Number(rows?.[0]?.count || 0);
    if (sequence <= 0) {
      throw new CoolCommException('報價單流水號生成失敗，請稍後再試');
    }
    const sequenceText = String(sequence).padStart(2, '0');
    return `${quoteNoPrefix}${quoteDate.format('YYYYMMDD')}${sequenceText}`;
  }

  private async getQuoteNoPrefix(salesmanId: number) {
    if (!salesmanId) {
      throw new CoolCommException('報價單缺少業務員，無法生成報價單編號');
    }
    const user = await this.baseSysUserEntity.findOneBy({ id: salesmanId });
    if (!user) {
      throw new CoolCommException('找不到對應業務員，無法生成報價單編號');
    }
    const englishName = this.normalizeQuoteNoPrefix(user.englishName);
    if (!englishName) {
      throw new CoolCommException('業務員尚未設定英文名稱，請先至使用者列表維護');
    }
    return englishName;
  }

  private normalizeQuoteNoPrefix(value: any) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^A-Za-z0-9_-]/g, '')
      .slice(0, 30);
  }

  private async generateInvoiceNo() {
    for (let i = 0; i < 10; i++) {
      const invoiceNo = `INV${moment().format('YYYYMMDDHHmmss')}${this.randomDigits(
        6
      )}`;
      const rows = await this.nativeQuery(
        'SELECT COUNT(1) AS count FROM crm_quote_invoice WHERE invoiceNo = ?',
        [invoiceNo]
      );
      if (Number(rows?.[0]?.count || 0) === 0) {
        return invoiceNo;
      }
    }
    throw new CoolCommException('鍙戠エID鐢熸垚澶辮觸錛岃閲嶈瘯');
  }

  private normalizeQuoteType(value: any) {
    return Number(value) === 2 ? 2 : 1;
  }

  private toRatePercent(value: any) {
    const num = this.toNumber(value);
    if (num <= 0) {
      return 0;
    }
    return this.toNumber(Math.min(100, num));
  }

  private calcDiscountDeductionAmount(
    amount: any,
    discountRate: any,
    baseRate = this.VIP_MAX_DISCOUNT_RATE
  ) {
    return this.toMoney(
      this.toMoney(amount) *
        (Math.max(0, this.toRatePercent(discountRate) - baseRate) / 100)
    );
  }

  private async getQuoteDiscountThreshold() {
    const value = await this.baseSysParamService.dataByKey('quote_discount_rate');
    return this.toRatePercent(value);
  }

  private async resolveDiscountAudit(
    customer: any,
    discountRate: any
  ) {
    const rate = this.toRatePercent(discountRate);
    if (Number(customer?.isVip || 0) === 1) {
      const required = rate > this.VIP_MAX_DISCOUNT_RATE;
      return {
        required,
        reason: required ? this.VIP_DISCOUNT_AUDIT_REASON : '',
        thresholdRate: this.VIP_MAX_DISCOUNT_RATE,
      };
    }

    const thresholdRate = await this.getQuoteDiscountThreshold();
    const required = thresholdRate > 0 && rate > thresholdRate;
    return {
      required,
      reason: required ? this.DEFAULT_DISCOUNT_AUDIT_REASON : '',
      thresholdRate,
    };
  }

  private async getDiscountDeductionBaseRate(order: any) {
    const reason = String(order?.discountAuditReason || '');
    if (reason.includes('VIP')) {
      return this.VIP_MAX_DISCOUNT_RATE;
    }

    const customer = await this.crmCustomerInfoEntity.findOneBy({
      id: Number(order?.customerId || 0),
      isDeleted: 0,
    });
    if (Number(customer?.isVip || 0) === 1) {
      return this.VIP_MAX_DISCOUNT_RATE;
    }

    const thresholdRate = await this.getQuoteDiscountThreshold();
    return thresholdRate > 0 ? thresholdRate : this.VIP_MAX_DISCOUNT_RATE;
  }

  private async getQuoteOrderItemsAmount(quoteOrderId: number) {
    const rows = await this.nativeQuery(
      `
      SELECT COALESCE(SUM(subtotalAmount), 0) AS amount
      FROM crm_quote_order_item
      WHERE quoteOrderId = ?
        AND isDeleted = 0
    `,
      [quoteOrderId]
    );
    return this.toMoney(rows?.[0]?.amount || 0);
  }

  private getMinActualPrice(presetPrice: any) {
    const price = this.toMoney(presetPrice);
    if (price <= 0) {
      return 0;
    }
    return this.toMoney(price * 0.85);
  }

  private normalizeDate(value: any) {
    const text = String(value || '').trim();
    if (!text) {
      return null;
    }
    return text.slice(0, 10);
  }

  private normalizeDateTime(value: any) {
    const text = String(value || '').trim();
    return text || null;
  }

  private normalizeDateValue(value: any) {
    const text = String(value || '').trim().replace(/\//g, '-');
    const matched = text.match(/\d{4}-\d{2}-\d{2}/);
    return matched ? matched[0] : '';
  }

  private buildEcpayInvalidInvoiceDateCandidates(invoice: CrmQuoteInvoiceEntity) {
    const values = [
      invoice.ecpayInvoiceDate,
      invoice.ecpayIssueTime,
      invoice.auditTime,
      invoice.applyTime,
      invoice.createTime,
    ];
    const dates: string[] = [];
    for (const value of values) {
      const date = this.normalizeDateValue(value);
      if (date && !dates.includes(date)) {
        dates.push(date);
      }
    }
    return dates;
  }

  private isEcpayInvoiceNoOrDateError(error: any) {
    const message = String(error?.message || error?.data?.message || error || '');
    return message.includes('發票號碼或日期錯誤') || message.includes('發票號碼或日期錯誤');
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

  private toCent(value: any) {
    return Math.round(this.toNumber(value) * 100);
  }

  private pickMoneyValue(value: any, fallback: number) {
    if (value === undefined || value === null || value === '') {
      return this.toMoney(fallback);
    }
    return this.toMoney(value);
  }

  private pickNumberValue(value: any, fallback: number) {
    if (value === undefined || value === null || value === '') {
      return this.toNumber(fallback);
    }
    return this.toNumber(value);
  }

  private normalizeRate(value: any) {
    const ratio = this.toNumber(value);
    if (ratio > 1) {
      return this.toNumber(ratio / 100);
    }
    return ratio;
  }

  private toNullableNumber(value: any) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const n = Number(value);
    return Number.isNaN(n) || n <= 0 ? null : n;
  }

  private now() {
    return moment().format('YYYY-MM-DD HH:mm:ss');
  }

  private getBusinessStatusSql() {
    return `
      CASE
        WHEN a.receiptStatus = 2 OR a.paymentStatus = 2 THEN 7
        WHEN a.contractStatus = 1 THEN 6
        WHEN a.sendTime IS NOT NULL OR a.status = 6 THEN 5
        WHEN a.auditStatus = 2 THEN 4
        WHEN a.auditStatus = 3 THEN 3
        WHEN a.auditStatus = 1 THEN 2
        WHEN a.discountAuditStatus = 1 THEN 2
        WHEN a.discountAuditStatus = 4 THEN 3
        ELSE 1
      END
    `;
  }

  private getBusinessStatus(order: any) {
    const businessStatus = Number(order?.businessStatus || 0);
    if (businessStatus > 0) {
      return businessStatus;
    }

    if (
      Number(order?.receiptStatus || 0) === 2 ||
      Number(order?.paymentStatus || 0) === 2
    ) {
      return 7;
    }

    if (Number(order?.contractStatus || 0) === 1) {
      return 6;
    }

    if (order?.sendTime || Number(order?.status || 0) === 6) {
      return 5;
    }

    if (Number(order?.auditStatus || 0) === 2) {
      return 4;
    }

    if (Number(order?.auditStatus || 0) === 3) {
      return 3;
    }

    if (Number(order?.auditStatus || 0) === 1) {
      return 2;
    }

    if (Number(order?.discountAuditStatus || 0) === 1) {
      return 2;
    }

    if (Number(order?.discountAuditStatus || 0) === 4) {
      return 3;
    }

    return 1;
  }

  private randomDigits(length: number) {
    return String(Math.floor(Math.random() * 10 ** length)).padStart(
      length,
      '0'
    );
  }

  async getScope(): Promise<QuoteScope> {
    const userId = Number(this.ctx.admin?.userId || 0);
    const roleIds: number[] = userId
      ? await this.baseSysRoleService.getByUser(userId)
      : this.ctx.admin?.roleIds || [];
    const roles = roleIds.length
      ? await this.baseSysRoleEntity.findBy({ id: In(roleIds) })
      : [];
    const roleLabels = roles.map(item => item.label);
    const roleNames = roles.map(item =>
      String(item.name || '')
        .trim()
        .toLowerCase()
    );
    const roleKeys = [...roleLabels, ...roleNames].map(item =>
      String(item || '')
        .trim()
        .toLowerCase()
    );
    const isBoss =
      this.ctx.admin?.username === 'admin' ||
      roleLabels.some(label => this.SUPER_ROLE_LABELS.includes(label));
    const hasDiscountAuditPerm = await this.hasRolePerm(
      roleIds,
      'crm:quoteOrder:auditDiscount',
      this.ctx.admin?.username === 'admin'
    );
    const isFinance =
      roleLabels.some(label => this.FINANCE_ROLE_LABELS.includes(label)) ||
      roleNames.some(name =>
        this.FINANCE_ROLE_NAMES.some(item => name.includes(item.toLowerCase()))
      );
    const isOfficeClerkManager =
      isBoss ||
      roleLabels.includes(this.INTERNAL_MANAGER_ROLE_LABEL) ||
      roleKeys.some(name =>
        this.INTERNAL_MANAGER_ROLE_NAMES.some(item =>
          name.includes(item.toLowerCase())
        )
      );
    const isOfficeClerk =
      roleLabels.includes(this.INTERNAL_ROLE_LABEL) ||
      (!isOfficeClerkManager &&
        roleKeys.some(name =>
          this.INTERNAL_ROLE_NAMES.some(item =>
            name.includes(item.toLowerCase())
          )
        ));
    const isSalesperson = isBoss || roleLabels.includes(SALESMAN_ROLE_LABEL);
    const departmentIds =
      isOfficeClerkManager || isOfficeClerk
        ? await this.getCurrentDepartmentIds(userId)
        : [];
    const departmentUserIds = departmentIds.length
      ? await this.getDepartmentUserIds(departmentIds)
      : [];

    return {
      userId,
      roleLabels,
      hasDiscountAuditPerm,
      departmentIds,
      departmentUserIds,
      isBoss,
      isFinance,
      isOfficeClerkManager,
      isOfficeClerk,
      isSalesperson,
    };
  }

  private async hasRolePerm(
    roleIds: number[],
    perm: string,
    isAdmin = false
  ) {
    if (isAdmin) {
      return true;
    }

    if (!roleIds.length) {
      return false;
    }

    const rows = await this.nativeQuery(
      `
      SELECT DISTINCT m.perms
      FROM base_sys_menu m
      INNER JOIN base_sys_role_menu rm ON rm.menuId = m.id
      WHERE rm.roleId IN (?)
        AND m.perms IS NOT NULL
      `,
      [roleIds]
    );

    return (rows || []).some(row =>
      String(row?.perms || '')
        .split(',')
        .map(item => item.trim())
        .includes(perm)
    );
  }

  buildPageScopeSql(scope: QuoteScope) {
    if (scope.isBoss) {
      return { sql: '', params: {} };
    }

    if (scope.isOfficeClerkManager) {
      const departmentIds = scope.departmentIds.length
        ? scope.departmentIds
        : [null];
      return {
        sql: this.setSql(
          true,
          `and (
            (
              exists (
                select 1
                from crm_quote_order_department_audit da
                where da.quoteOrderId = a.id
                  and da.isDeleted = 0
                  and da.departmentId in (?)
              )
              or exists (
                select 1
                from crm_quote_order_item qi
                where qi.quoteOrderId = a.id
                  and qi.isDeleted = 0
                  and qi.departmentId in (?)
              )
            )
            and (
              ${scope.hasDiscountAuditPerm ? 'a.discountAuditStatus = 1 or' : ''}
              a.status <> 1
            )
          )`,
          [departmentIds, departmentIds]
        ),
        params: {},
      };
    }

    if (scope.isOfficeClerk) {
      return {
        sql: this.setSql(
          true,
          `and (
            ${scope.hasDiscountAuditPerm ? 'a.discountAuditStatus = 1 or' : ''}
            (
              a.status <> 1
              and (
                a.currentAssigneeId = ?
                or exists (
                  select 1
                  from crm_quote_order_department_audit da
                  where da.quoteOrderId = a.id
                    and da.isDeleted = 0
                    and da.assigneeId = ?
                )
              )
            )
          )`,
          [scope.userId, scope.userId]
        ),
        params: {},
      };
    }

    return {
      sql: this.setSql(
        true,
        `and (
          ${scope.hasDiscountAuditPerm ? 'a.discountAuditStatus = 1 or' : ''}
          a.salesmanId = ?
          or a.accompanySalesmanId = ?
        )`,
        [scope.userId, scope.userId]
      ),
      params: {},
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

  private canManageDepartment(departmentId: number, scope: QuoteScope) {
    if (scope.isBoss) {
      return true;
    }
    return scope.departmentIds.includes(departmentId);
  }

  private async listDepartmentInternalUsers(departmentId: number) {
    const departmentIds = await this.getDepartmentAndChildrenIds(departmentId);
    const rows = await this.nativeQuery(
      `
      SELECT DISTINCT
        a.id,
        a.name,
        a.nickName,
        a.username,
        a.level,
        a.departmentId
      FROM base_sys_user a
      INNER JOIN base_sys_user_role ur ON ur.userId = a.id
      INNER JOIN base_sys_role r ON r.id = ur.roleId
      WHERE a.status = 1
        AND a.username != 'admin'
        AND a.departmentId in (?)
        AND r.label IN (?, ?)
      ORDER BY a.name ASC, a.id ASC
    `,
      [
        departmentIds.length ? departmentIds : [null],
        this.INTERNAL_ROLE_LABEL,
        this.INTERNAL_MANAGER_ROLE_LABEL,
      ]
    );
    return rows || [];
  }

  private async ensureDepartmentAssigneeRole(
    userId: number,
    departmentId: number,
    scope: QuoteScope
  ) {
    const rows = await this.listDepartmentInternalUsers(departmentId);
    const user = rows.find(
      item => Number(item.id || 0) === Number(userId || 0)
    );
    if (
      !user ||
      (!scope.isBoss && !this.canManageDepartment(departmentId, scope))
    ) {
      throw new CoolCommException('所選內勤人員不在當前部門或無權指派');
    }
    return user;
  }

  private buildPermissions(order: any, scope: QuoteScope) {
    return {
      canEdit: this.canEditOrder(order, scope),
      canApplyAllowance: this.canApplyAllowance(order, scope),
      canDelete: this.canDeleteOrder(order, scope),
      canSubmitAudit: this.canSubmitAudit(order, scope),
      canDiscountAudit: this.canDiscountAudit(order, scope),
      canAudit: this.canAuditOrder(order, scope),
      canAssign: this.canAssignOrder(order, scope),
      canSendQuote: this.canSendQuote(order, scope),
      canUploadContract: this.canUploadContract(order, scope),
      canReceipt: this.canHandleReceipt(order, scope),
      canInvoice: this.canHandleInvoice(order, scope),
      canCopyCreate: this.canAccessOrder(order, scope),
    };
  }

  private async buildCaseMeetingPermissions(order: any, scope: QuoteScope) {
    return {
      canViewCaseMeeting: this.canViewCaseMeeting(scope),
      canUpdateCaseMeeting: await this.canUpdateCaseMeeting(order, scope),
    };
  }

  private async buildDepartmentPermissionSummary(
    orderId: number,
    scope: QuoteScope
  ) {
    const [audits, order] = await Promise.all([
      this.crmQuoteOrderDepartmentAuditEntity.find({
        where: { quoteOrderId: orderId, isDeleted: 0 },
      }),
      this.crmQuoteOrderEntity.findOneBy({ id: orderId, isDeleted: 0 }),
    ]);
    const canDepartmentAudit = audits.some(audit =>
      this.canAuditDepartment(audit, scope)
    );
    const canDepartmentAssign = audits.some(audit =>
      this.canAssignDepartment(audit, order, scope)
    );
    return {
      canDepartmentAudit,
      canDepartmentAssign,
      canDepartmentCost: audits.some(audit =>
        this.canSubmitDepartmentCost(audit, scope)
      ),
      canDepartmentAuditDialog:
        scope.isBoss && (canDepartmentAudit || canDepartmentAssign),
      canInlineDepartmentAudit: !scope.isBoss && canDepartmentAudit,
      canInlineDepartmentAssign: !scope.isBoss && canDepartmentAssign,
    };
  }

  private buildEditableFields(order: any, scope: QuoteScope) {
    if (!this.canEditOrder(order, scope) && !this.canApplyAllowance(order, scope)) {
      return [];
    }

    if (this.canApplyAllowance(order, scope)) {
      return [
        'customerId',
        'quoteName',
        'quoteType',
        'accompanySalesmanId',
        'startDate',
        'endDate',
        'items',
        'stages',
        'remark',
        'quoteTerms',
      ];
    }

    if (this.isPaymentStageOnlyEditable(order)) {
      return ['stages'];
    }

    return [
      'customerId',
      'quoteName',
      'quoteType',
      'accompanySalesmanId',
      'startDate',
      'endDate',
      'items',
      'stages',
      'remark',
      'quoteTerms',
    ];
  }

  private canAccessOrder(order: any, scope: QuoteScope) {
    if (scope.isBoss || scope.isOfficeClerkManager) {
      return true;
    }

    if (
      scope.hasDiscountAuditPerm &&
      Number(order.discountAuditStatus || 0) === 1
    ) {
      return true;
    }

    if (
      scope.isOfficeClerk &&
      Number(order.currentAssigneeId || 0) === Number(scope.userId || 0)
    ) {
      return true;
    }

    return Number(order.salesmanId || 0) === Number(scope.userId || 0);
  }

  private canViewOrder(order: any, scope: QuoteScope) {
    if (this.canAccessOrder(order, scope)) {
      return true;
    }

    return (
      Number(order.accompanySalesmanId || 0) === Number(scope.userId || 0)
    );
  }

  private getViewerSalesIdentity(order: any, scope: QuoteScope) {
    const userId = Number(scope.userId || 0);
    if (userId > 0 && Number(order.accompanySalesmanId || 0) === userId) {
      return 'accompany';
    }
    if (userId > 0 && Number(order.salesmanId || 0) === userId) {
      return 'main';
    }
    return Number(order.accompanySalesmanId || 0) > 0 ? 'main' : 'normal';
  }

  private buildDiscountAuditFilterSql(value: any) {
    const filter = String(value || 'all');
    if (filter === 'pending') {
      return 'and a.discountAuditStatus = 1';
    }
    if (filter === 'none') {
      return 'and COALESCE(a.discountAuditStatus, 0) = 0';
    }
    return '';
  }

  private canSalesOperate(order: any, scope: QuoteScope) {
    if (scope.isBoss) {
      return true;
    }
    return Number(order.salesmanId || 0) === Number(scope.userId || 0);
  }

  private async normalizeAccompanySalesmanId(value: any, salesmanId: number) {
    const accompanySalesmanId = Number(value || 0);
    if (!accompanySalesmanId || accompanySalesmanId === Number(salesmanId || 0)) {
      return null;
    }
    await this.ensureSalesmanRole(accompanySalesmanId);
    return accompanySalesmanId;
  }

  private async ensureSalesmanRole(userId: number) {
    const user = await this.baseSysUserEntity.findOneBy({ id: userId, status: 1 });
    if (!user) {
      throw new CoolCommException('陪同管理業務不存在');
    }
    const rows = await this.nativeQuery(
      `
      SELECT ur.userId
      FROM base_sys_user_role ur
      INNER JOIN base_sys_role r ON r.id = ur.roleId
      WHERE ur.userId = ?
        AND r.label = ?
      LIMIT 1
    `,
      [userId, SALESMAN_ROLE_LABEL]
    );
    if (!rows?.length) {
      throw new CoolCommException('陪同管理業務必須為業務角色');
    }
    return user;
  }

  private canEditOrder(order: any, scope: QuoteScope) {
    if (!this.canSalesOperate(order, scope)) {
      return false;
    }

    const businessStatus = this.getBusinessStatus(order);
    if (businessStatus === 7) {
      return false;
    }

    if (this.isPaymentStageOnlyEditable(order)) {
      return true;
    }

    return businessStatus !== 6;
  }

  private canApplyAllowance(order: any, scope: QuoteScope) {
    return (
      this.canSalesOperate(order, scope) &&
      this.hasIssuedInvoice(order)
    );
  }

  private canDeleteOrder(order: any, scope: QuoteScope) {
    return (
      this.canSalesOperate(order, scope) &&
      // 草稿、待審與退回狀態尚未形成簽約或回款資料，允許刪除。
      [1, 2, 3].includes(this.getBusinessStatus(order))
    );
  }

  private isPaymentStageOnlyEditable(order: any) {
    return (
      Number(order.contractStatus || 0) === 1 ||
      Number(order.auditStatus || 0) === 2
    );
  }

  private isDiscountAuditPassed(order: any) {
    return [0, 2, 3].includes(Number(order.discountAuditStatus || 0));
  }

  private canDiscountAudit(order: any, scope: QuoteScope) {
    return (
      scope.hasDiscountAuditPerm && Number(order.discountAuditStatus || 0) === 1
    );
  }

  private canSubmitAudit(order: any, scope: QuoteScope) {
    return (
      this.isDiscountAuditPassed(order) &&
      this.canSalesOperate(order, scope) &&
      [1, 3].includes(Number(order.status || 0))
    );
  }

  private canAuditOrder(order: any, scope: QuoteScope) {
    return (
      this.isDiscountAuditPassed(order) &&
      scope.isOfficeClerkManager &&
      Number(order.status || 0) === 2 &&
      Number(order.auditStatus || 0) === 1
    );
  }

  private canAssignOrder(order: any, scope: QuoteScope) {
    return (
      this.isDiscountAuditPassed(order) &&
      scope.isOfficeClerkManager &&
      Number(order.status || 0) === 4 &&
      Number(order.auditStatus || 0) === 2 &&
      Number(order.assignStatus || 0) === 1
    );
  }

  private canSendQuote(order: any, scope: QuoteScope) {
    return (
      this.isDiscountAuditPassed(order) &&
      this.canSalesOperate(order, scope) &&
      [4, 5, 6].includes(Number(order.status || 0)) &&
      Number(order.auditStatus || 0) === 2
    );
  }

  private canUploadContract(order: any, scope: QuoteScope) {
    return (
      this.isDiscountAuditPassed(order) &&
      this.canAccessOrder(order, scope) &&
      ![6, 7].includes(this.getBusinessStatus(order)) &&
      Number(order.contractStatus || 0) !== 1
    );
  }

  private canHandleReceipt(order: any, scope: QuoteScope) {
    return this.isDiscountAuditPassed(order) && this.canAccessOrder(order, scope);
  }

  private canHandleInvoice(order: any, scope: QuoteScope) {
    return (
      this.isDiscountAuditPassed(order) &&
      this.canAccessOrder(order, scope) &&
      Number(order.auditStatus || 0) === 2
    );
  }

  private ensureCanEdit(order: any, scope: QuoteScope) {
    if (!this.canEditOrder(order, scope)) {
      throw new CoolCommException('當前無權限修改報價單');
    }
  }

  private async ensureCanApplyAllowance(order: any, scope: QuoteScope) {
    const hasIssuedInvoice =
      this.hasIssuedInvoice(order) ||
      (await this.hasIssuedInvoiceByOrderId(Number(order?.id || 0)));

    if (
      !this.canSalesOperate(order, scope) ||
      !hasIssuedInvoice
    ) {
      throw new CoolCommException('當前報價單不允許申請折讓');
    }
    if (!hasIssuedInvoice) {
      throw new CoolCommException('只有已開過發票的報價單才可以申請折讓');
    }
  }

  private hasIssuedInvoice(order: any) {
    return Number(order?.issuedInvoiceCount || 0) > 0;
  }

  private async hasIssuedInvoiceByOrderId(quoteOrderId: number) {
    if (!quoteOrderId) {
      return false;
    }

    const rows = await this.nativeQuery(
      `
      SELECT COUNT(1) AS issuedCount
      FROM crm_quote_invoice
      WHERE quoteOrderId = ?
        AND isDeleted = 0
        AND status = 2
        AND IFNULL(ecpayInvalidStatus, 0) <> 2
        AND voidTime IS NULL
    `,
      [quoteOrderId]
    );

    return Number(rows?.[0]?.issuedCount || 0) > 0;
  }

  private ensureCanSubmitAudit(order: any, scope: QuoteScope) {
    if (!this.canSubmitAudit(order, scope)) {
      throw new CoolCommException('當前狀態不允許提交審核');
    }
  }

  private ensureDiscountAuditPassed(order: any) {
    const status = Number(order?.discountAuditStatus || 0);
    if (status === 1) {
      throw new CoolCommException(
        order?.discountAuditReason || '優惠比例需要老闆審批'
      );
    }
    if (status === 4) {
      throw new CoolCommException('優惠審批未通過，請重新填寫優惠比例');
    }
  }

  private ensureCanAudit(order: any, scope: QuoteScope) {
    if (!this.canAuditOrder(order, scope)) {
      throw new CoolCommException('當前狀態不允許審核');
    }
  }

  private ensureCanAssign(order: any, scope: QuoteScope) {
    if (!this.canAssignOrder(order, scope)) {
      throw new CoolCommException('當前狀態不允許分配');
    }
  }

  private ensureCanSendQuote(order: any, scope: QuoteScope) {
    if (!this.canSendQuote(order, scope)) {
      throw new CoolCommException('當前狀態不允許傳送報價單');
    }
  }

  private ensureCanUploadContract(order: any, scope: QuoteScope) {
    if (!this.canUploadContract(order, scope)) {
      throw new CoolCommException('當前狀態不允許回傳合約');
    }
  }

  private ensureCanHandleReceipt(order: any, scope: QuoteScope) {
    if (!this.canHandleReceipt(order, scope)) {
      throw new CoolCommException('當前狀態不允許登記回款');
    }
  }

  private ensureCanHandleInvoice(order: any, scope: QuoteScope) {
    if (!this.canHandleInvoice(order, scope)) {
      throw new CoolCommException(
        '所有內勤審核通過後才可以申請開票'
      );
    }
  }

  private async refreshOrderReceiptAndInvoiceStatus(quoteOrderId: number) {
    const stages = await this.crmQuoteOrderStageEntity.find({
      where: { quoteOrderId, isDeleted: 0 },
      order: { sortNum: 'ASC', id: 'ASC' },
    });

    const activeStages = stages || [];
    const receiptDoneCount = activeStages.filter(
      item =>
        Number(item.receiptStatus) === 1 && this.toMoney(item.receiptAmount) > 0
    ).length;
    const invoiceAppliedCount = activeStages.filter(
      item => Number(item.invoiceStatus) === 1
    ).length;

    let receiptStatus = 0;
    if (receiptDoneCount > 0) {
      receiptStatus = receiptDoneCount >= activeStages.length ? 2 : 1;
    }

    let invoiceStatus = 0;
    if (invoiceAppliedCount > 0) {
      invoiceStatus = invoiceAppliedCount >= activeStages.length ? 2 : 1;
    }

    const payload: Partial<CrmQuoteOrderEntity> = {
      receiptStatus,
      paymentStatus: receiptStatus,
      invoiceStatus,
    };
    if (receiptStatus === 2) {
      payload.status = 7;
    }

    await this.crmQuoteOrderEntity.update({ id: quoteOrderId }, payload);
  }

  private async ensureAssigneeRole(userId: number) {
    const user = await this.baseSysUserEntity.findOneBy({ id: userId });
    if (!user || Number(user.status) !== 1) {
      throw new CoolCommException('內勤人員不存在或已停用');
    }

    const rows = await this.nativeQuery(
      `
      SELECT ur.userId
      FROM base_sys_user_role ur
      INNER JOIN base_sys_role r ON r.id = ur.roleId
      WHERE ur.userId = ?
        AND r.label IN (?, ?)
      LIMIT 1
    `,
      [userId, this.INTERNAL_ROLE_LABEL, this.INTERNAL_MANAGER_ROLE_LABEL]
    );

    if (!rows?.length) {
      throw new CoolCommException('所選使用者不是內勤人員');
    }

    return user;
  }

  private buildQuoteHistoryPdf(
    history: any,
    currentOrder: any,
    customer: any,
    dutyParam: any,
    quoteTermSections: QuoteTermSection[],
    partyB: any,
    paymentCondition: string
  ) {
    const snapshot = history?.snapshot || {};
    const order = snapshot?.order || currentOrder || {};
    const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
    const stages = Array.isArray(snapshot?.stages) ? snapshot.stages : [];
    const dutyRate = this.parseDutyRate(dutyParam);
    const finalAmount = this.toMoney(order.finalAmount || history?.amount || 0);
    const untaxedAmount = dutyRate > 0 ? this.toMoney(finalAmount / (1 + dutyRate)) : finalAmount;
    const dutyAmount = this.toMoney(finalAmount - untaxedAmount);
    const lines: QuotePdfLine[] = [];

    const addLine = (text = '', size = 10, gap = 0) => {
      lines.push({ text, size, gap });
    };
    const addSection = (text: string) => {
      addLine('', 10, 2);
      addLine(text, 13, 4);
    };

    const quotePartyB = this.normalizeQuotePartyB(partyB);

    addLine('合作報價單', 18, 8);
    addLine(`報價單號：${history?.quoteNo || order.quoteNo || '-'}    版本時間：${history?.createTime || '-'}`, 10, 4);

    addSection('甲乙方資訊');
    addLine(`甲方名稱：${customer?.companyName || customer?.contactName || '-'}`);
    addLine(`甲方地址：${customer?.address || '-'}`);
    addLine(`甲方統一編號：${customer?.taxNumber || '-'}`);
    addLine(`甲方匯款後五碼：${customer?.remittanceLast5 || '-'}`);
    addLine(`甲方聯絡人：${customer?.contactName || '-'}`);
    addLine(`甲方信箱：${customer?.email || '-'}`);
    addLine(`甲方電話：${customer?.mobile || '-'}`);
    addLine(`乙方名稱：${quotePartyB.companyName || '-'}`);
    addLine(`乙方地址：${quotePartyB.address || '-'}`);
    addLine(`乙方統一編號：${quotePartyB.taxNumber || '-'}`);
    addLine(`乙方聯絡人：${quotePartyB.contactName || '-'}`);
    addLine(`乙方信箱：${quotePartyB.email || '-'}`);
    addLine(`乙方電話：${quotePartyB.mobile || '-'}`);

    addSection('專案資訊');
    addLine(`專案名稱：${order.quoteName || history?.quoteName || '-'}`);
    addLine(`專案期間：${order.startDate || '-'} 至 ${order.endDate || '-'}`);
    addLine(`專案性質：${Number(order.quoteType) === 2 ? '續約' : '新客'}`);

    addSection('專案專案');
    if (items.length === 0) {
      addLine('暫無產品專案');
    } else {
      items.forEach((item: any, index: number) => {
        addLine(`${index + 1}. ${item.productName || '-'} / ${item.specName || '-'} / ${item.quantity || 0} / ${this.formatMoney(item.subtotalAmount || item.actualPrice || 0)}`);
      });
    }

    addSection('執行備註');
    addLine(order.execRemark || history?.remark || '本委刊內容仍依實際操作調整');

    addSection('專案總價與付款條件');
    addLine(`刊登未稅價：${this.formatMoney(untaxedAmount)}`);
    addLine(`營業稅：${this.formatMoney(dutyAmount)}（稅率 ${this.formatPercent(dutyRate)}）`);
    addLine(`含稅總價：${this.formatMoney(finalAmount)}`);
    this.normalizeQuotePaymentCondition(paymentCondition)
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach(line => addLine(line));

    if (stages.length > 0) {
      addLine('付款階段：', 10, 2);
      stages.forEach((stage: any, index: number) => {
        addLine(`${index + 1}. ${stage.stageName || `階段${stage.stageNo || index + 1}`} / ${this.formatPercent(this.toNumber(stage.ratio || 0))} / ${this.formatMoney(stage.amount || 0)} / 發票票期：${stage.invoiceDate || '-'}`);
      });
    }

    addSection('乙方匯款資訊');
    addLine(`聯絡人：${quotePartyB.contactName || '-'}`);
    addLine(`Email：${quotePartyB.email || '-'}`);
    addLine(`戶名：${quotePartyB.bankAccountName || quotePartyB.companyName || '-'}`);
    addLine(`銀行程式碼：${quotePartyB.bankCode || '-'}${quotePartyB.bankName ? `（${quotePartyB.bankName}）` : ''}`);
    addLine(`帳號：${quotePartyB.bankAccountNo || '-'}`);

    const terms = this.flattenQuoteTermSections(quoteTermSections);
    if (terms.length > 0) {
      addSection('雙方合作條款約定');
      terms.forEach(text => addLine(text));
    }

    return this.createPdf(lines);
  }

  private loadQuoteTemplateTermSections(): QuoteTermSection[] {
    const filePaths = [
      path.join(process.cwd(), 'public', 'template', 'quote-template.docx'),
      path.join(
        process.cwd(),
        'cool-admin-midway',
        'public',
        'template',
        'quote-template.docx'
      ),
      'D:\\RY\\taiwanCRM\\闇€奼傛枃妗\鎶ヤ環鍗曟ā鏉?docx',
    ];
    const filePath = filePaths.find(item => fs.existsSync(item));
    if (!filePath) {
      return [];
    }

    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(filePath);
      const entry = zip.getEntry('word/document.xml');
      if (!entry) {
        return [];
      }
      const paragraphs = this.extractDocxParagraphs(
        entry.getData().toString('utf8')
      );
      const startIndex = paragraphs.findIndex(item =>
        item.includes('闆欐柟鍚堜綔姊濇鞝勫畾')
      );
      const terms = startIndex >= 0 ? paragraphs.slice(startIndex + 1) : [];
      const items: QuoteTermItem[] = [];
      for (let index = 0; index < terms.length; index++) {
        const text = terms[index];
        if (!text) {
          continue;
        }
        if (/^\d+$/.test(text) && terms[index + 1]) {
          items.push({ no: Number(text), text: terms[index + 1] });
          index++;
          continue;
        }
        items.push({ text });
      }
      return items.length > 0 ? [{ title: '報價單條款', items }] : [];
    } catch {
      return [];
    }
  }

  private normalizeQuoteTermSections(value: any): QuoteTermSection[] {
    let source = value;
    if (typeof source === 'string') {
      try {
        source = JSON.parse(source);
      } catch {
        source = source
          .split(/\r?\n/)
          .map(item => item.trim())
          .filter(Boolean);
      }
    }
    if (Array.isArray(source)) {
      if (source.every(item => typeof item === 'string')) {
        return [
          {
            title: '報價單條款',
            items: source.map((text, index) => ({ no: index + 1, text })),
          },
        ];
      }
      return source
        .map(section => ({
          title: String(section?.title || '報價單條款'),
          items: Array.isArray(section?.items)
            ? section.items
                .map((item, index) => ({
                  no: item?.no ?? index + 1,
                  text: String(item?.text || '').trim(),
                }))
                .filter(item => item.text)
            : [],
        }))
        .filter(section => section.items.length > 0);
    }
    return [];
  }

  private flattenQuoteTermSections(sections: QuoteTermSection[]) {
    const lines: string[] = [];
    sections.forEach(section => {
      if (section.title) {
        lines.push(section.title);
      }
      section.items.forEach(item => {
        const no = item.no !== undefined && item.no !== null ? `${item.no}. ` : '';
        lines.push(`${no}${this.fillCurrentDateInTermText(item.text)}`);
      });
    });
    return lines;
  }

  private fillCurrentDateInTermText(value: any) {
    const text = String(value || '').trim();
    if (!text) {
      return '';
    }
    return text.replace(
      /[　\s]{2,}年[　\s]{1,}月[　\s]{1,}日/g,
      this.withCombiningUnderline(moment().format('YYYY年M月D日'))
    );
  }

  private withCombiningUnderline(text: string) {
    return String(text || '')
      .split('')
      .map(char => `${char}\u0332`)
      .join('');
  }

  private extractDocxParagraphs(xml: string) {
    return String(xml || '')
      .split(/<\/w:p>/)
      .map(part => {
        const normalized = part
          .replace(/<w:tab[^>]*\/>/g, '<w:t>    </w:t>')
          .replace(/<w:br[^>]*\/>/g, '<w:t>\n</w:t>');
        const texts = Array.from(
          normalized.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)
        ).map(match => this.decodeXml(match[1]));
        return texts.join('').replace(/\s+/g, ' ').trim();
      })
      .filter(Boolean);
  }

  private decodeXml(text: string) {
    return String(text || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  private createPdf(lines: QuotePdfLine[]) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 42;
    const marginY = 42;
    const bottomY = 42;
    const contentWidth = pageWidth - marginX * 2;
    const pages: QuotePdfLine[][] = [[]];
    let y = pageHeight - marginY;

    const pushPageLine = (line: QuotePdfLine) => {
      const size = line.size || 10;
      const lineHeight = size + 6 + (line.gap || 0);
      if (y - lineHeight < bottomY) {
        pages.push([]);
        y = pageHeight - marginY;
      }
      pages[pages.length - 1].push(line);
      y -= lineHeight;
    };

    lines.forEach(line => {
      const size = line.size || 10;
      const wrapped = this.wrapPdfText(line.text, contentWidth, size);
      wrapped.forEach((text, index) => {
        pushPageLine({
          text,
          size,
          gap: index === wrapped.length - 1 ? line.gap : 0,
        });
      });
    });

    const objects: string[] = [];
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[3] = [
      '<< /Type /Font',
      '/Subtype /Type0',
      '/BaseFont /MSung-Light',
      '/Encoding /UniCNS-UCS2-H',
      '/DescendantFonts [<< /Type /Font',
      '/Subtype /CIDFontType0',
      '/BaseFont /MSung-Light',
      '/CIDSystemInfo << /Registry (Adobe) /Ordering (CNS1) /Supplement 5 >>',
      '/FontDescriptor << /Type /FontDescriptor /FontName /MSung-Light /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>',
      '>>]',
      '>>',
    ].join(' ');

    const kids: string[] = [];
    let objectId = 4;
    pages.forEach(pageLines => {
      const pageId = objectId++;
      const contentId = objectId++;
      kids.push(`${pageId} 0 R`);
      objects[pageId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
      const stream = this.createPdfPageStream(
        pageLines,
        pageHeight,
        marginX,
        marginY
      );
      objects[contentId] =
        `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream`;
    });
    objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;

    const chunks: string[] = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];
    const offsets: number[] = [0];
    let offset = Buffer.byteLength(chunks[0], 'binary');
    for (let index = 1; index < objects.length; index++) {
      const objectText = `${index} 0 obj\n${objects[index]}\nendobj\n`;
      offsets[index] = offset;
      chunks.push(objectText);
      offset += Buffer.byteLength(objectText, 'utf8');
    }
    const xrefOffset = offset;
    const xref = [
      `xref\n0 ${objects.length}`,
      '0000000000 65535 f ',
      ...offsets
        .slice(1)
        .map(item => `${String(item).padStart(10, '0')} 00000 n `),
      `trailer\n<< /Size ${objects.length} /Root 1 0 R >>`,
      'startxref',
      String(xrefOffset),
      '%%EOF',
    ].join('\n');
    chunks.push(xref);
    return Buffer.from(chunks.join(''), 'binary');
  }

  private createPdfPageStream(
    lines: QuotePdfLine[],
    pageHeight: number,
    marginX: number,
    marginY: number
  ) {
    let y = pageHeight - marginY;
    return lines
      .map(line => {
        const size = line.size || 10;
        const command = `BT /F1 ${size} Tf 1 0 0 1 ${marginX} ${y.toFixed(2)} Tm <${this.toUtf16BeHex(line.text)}> Tj ET\n`;
        y -= size + 6 + (line.gap || 0);
        return command;
      })
      .join('');
  }

  private wrapPdfText(text: string, width: number, size: number) {
    const value = String(text || '');
    if (!value) {
      return [''];
    }
    const maxUnits = Math.max(8, width / size);
    const rows: string[] = [];
    let row = '';
    let rowUnits = 0;
    Array.from(value).forEach(char => {
      const units = this.getPdfCharUnits(char);
      if (row && rowUnits + units > maxUnits) {
        rows.push(row);
        row = char.trimStart();
        rowUnits = this.getPdfTextUnits(row);
        return;
      }
      row += char;
      rowUnits += units;
    });
    if (row) {
      rows.push(row);
    }
    return rows;
  }

  private getPdfTextUnits(text: string) {
    return Array.from(String(text || '')).reduce(
      (sum, char) => sum + this.getPdfCharUnits(char),
      0
    );
  }

  private getPdfCharUnits(char: string) {
    return /[\x00-\x7F]/.test(char) ? 0.55 : 1;
  }

  private toUtf16BeHex(text: string) {
    const buffer = Buffer.from(String(text || ''), 'utf16le');
    const bytes: number[] = [];
    for (let index = 0; index < buffer.length; index += 2) {
      bytes.push(buffer[index + 1], buffer[index]);
    }
    return Buffer.from(bytes).toString('hex').toUpperCase();
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

  private formatMoney(value: any) {
    return Number(this.toMoney(value || 0)).toLocaleString('zh-TW', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private formatPercent(value: any) {
    const number = this.toNumber(value || 0);
    return `${this.toNumber(number * 100).toLocaleString('zh-TW', {
      maximumFractionDigits: 2,
    })}%`;
  }

  private safeFileName(value: string) {
    return String(value || '報價單').replace(/[\\/:*?"<>|]/g, '_');
  }

  private canViewCaseMeeting(scope: QuoteScope) {
    return scope.isOfficeClerk;
  }

  private async canUpdateCaseMeeting(order: any, scope: QuoteScope) {
    if (!this.canViewCaseMeeting(scope)) {
      return false;
    }
    if (Number(order.contractStatus || 0) !== 1) {
      return false;
    }
    if (!this.isCaseMeetingWithinEditWindow(order)) {
      return false;
    }
    return await this.isOwnInternalAssignedOrder(order, scope);
  }

  private async isOwnInternalAssignedOrder(order: any, scope: QuoteScope) {
    if (Number(order.currentAssigneeId || 0) === Number(scope.userId || 0)) {
      return true;
    }
    return await this.hasOrderAssigneeAccess(Number(order.id || 0), scope);
  }

  private isCaseMeetingWithinEditWindow(order: any) {
    const time = String(order.contractUploadTime || '').trim();
    if (!time) {
      return false;
    }
    const uploadTime = moment(time);
    if (!uploadTime.isValid()) {
      return false;
    }
    return moment().isSameOrBefore(uploadTime.clone().add(14, 'days'));
  }

  private resolveLocalUploadFilePath(fileUrl: string) {
    const marker = '/upload/';
    let pathname = String(fileUrl || '').trim();
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      pathname = pathname.split('?')[0].split('#')[0];
    }

    const uploadIndex = pathname.indexOf(marker);
    if (uploadIndex < 0) {
      throw new CoolCommException('當前合約檔案不是本地上傳檔案，無法直接下載');
    }

    const relativeRaw = pathname.slice(uploadIndex + marker.length);
    let relative = '';
    try {
      relative = decodeURIComponent(relativeRaw);
    } catch {
      relative = relativeRaw;
    }

    relative = relative.replace(/^[/\\]+/, '');
    if (!relative || relative.includes('\0')) {
      throw new CoolCommException('合約檔案路徑無效');
    }

    const normalized = path.normalize(relative);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      throw new CoolCommException('合約檔案路徑無效');
    }

    const basePath = path.resolve(pUploadPath());
    const filePath = path.resolve(basePath, normalized);
    if (filePath !== basePath && !filePath.startsWith(basePath + path.sep)) {
      throw new CoolCommException('合約檔案路徑無效');
    }
    if (!fs.existsSync(filePath)) {
      throw new CoolCommException('合約檔案不存在');
    }

    return filePath;
  }

  private inferFileName(url: string) {
    const text = String(url || '').trim();
    if (!text) {
      return '';
    }
    const clean = text.split('?')[0];
    const name = clean.substring(clean.lastIndexOf('/') + 1);
    try {
      return decodeURIComponent(name);
    } catch {
      return name;
    }
  }
}
