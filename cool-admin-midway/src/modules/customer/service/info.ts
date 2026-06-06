import { InjectEntityModel } from '@midwayjs/typeorm';
import { Provide, Inject } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { CrmCustomerInfoEntity } from '../entity/info';
import { In, IsNull, Repository } from 'typeorm';
import { Context } from '@midwayjs/koa';
import { BaseSysPermsService } from '../../base/service/sys/perms';
import { BaseSysUserEntity } from '../../base/entity/sys/user';
import { BaseSysRoleEntity } from '../../base/entity/sys/role';
import { BaseSysDepartmentEntity } from '../../base/entity/sys/department';
import { CrmMailService } from './mail';

/** 可分配客戶的使用者須具備的角色標識（base_sys_role.label），與後台角色配置一致 */
export const SALESMAN_ROLE_LABEL = 'salesperson';

interface CustomerListScope {
  userId: number;
  isBoss: boolean;
  isOfficeClerkManager: boolean;
  scopedUserIds: number[];
}

@Provide()
export class CrmCustomerInfoService extends BaseService {
  private readonly AUTO_VIP_INVOICE_AMOUNT = 1500000;

  private readonly SUPER_ROLE_LABELS = ['admin', 'boss'];

  private readonly INTERNAL_MANAGER_ROLE_LABEL = 'office_clerk_manager';

  @InjectEntityModel(CrmCustomerInfoEntity)
  crmCustomerInfoEntity: Repository<CrmCustomerInfoEntity>;

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

  @Inject()
  crmMailService: CrmMailService;

  async isBoss(): Promise<boolean> {
    const roleIds = this.ctx.admin?.roleIds || [];
    return this.baseSysPermsService.isAdmin(roleIds);
  }

  private async isSalesman(): Promise<boolean> {
    const roleIds = this.ctx.admin?.roleIds || [];
    if (!roleIds.length) {
      return false;
    }
    const roles = await this.baseSysRoleEntity.findBy({ id: In(roleIds) });
    return roles.some(item => item.label === SALESMAN_ROLE_LABEL);
  }

  /**
   * 分配客戶時可選擇的使用者：啟用狀態且擁有業務員角色（role.label = salesperson）
   */
  async listSalesmenForAssign(): Promise<
    Pick<BaseSysUserEntity, 'id' | 'name' | 'nickName' | 'username'>[]
  > {
    const scope = await this.getCustomerListScope();
    if (!scope.isBoss && !scope.isOfficeClerkManager) {
      throw new CoolCommException('無權限');
    }
    const scopedUserIds = scope.scopedUserIds.length
      ? scope.scopedUserIds
      : [null];
    const rows = await this.nativeQuery(
      `
      SELECT DISTINCT a.id, a.name, a.nickName, a.username
      FROM base_sys_user a
      INNER JOIN base_sys_user_role ur ON ur.userId = a.id
      INNER JOIN base_sys_role r ON r.id = ur.roleId AND r.label = ?
      WHERE a.status = 1 AND a.username != 'admin'
        ${scope.isBoss ? '' : 'AND a.id in (?)'}
      ORDER BY a.id ASC
    `,
      scope.isBoss
        ? [SALESMAN_ROLE_LABEL]
        : [SALESMAN_ROLE_LABEL, scopedUserIds]
    );
    return rows || [];
  }

  /**
   * 客戶公池分頁：僅未分配業務員
   */
  async page(query: any) {
    const {
      companyName,
      contactName,
      mobile,
      email,
      keyword,
      industry,
      status,
      isAdCustomer,
    } = query;
    const sql = `
      SELECT a.*
      FROM crm_customer_info a
      WHERE a.isDeleted = 0
        AND a.salesmanId IS NULL
        ${this.setSql(companyName, 'and a.companyName like ?', [
          `%${companyName}%`,
        ])}
        ${this.setSql(contactName, 'and a.contactName like ?', [
          `%${contactName}%`,
        ])}
        ${this.setSql(mobile, 'and a.mobile like ?', [`%${mobile}%`])}
        ${this.setSql(email, 'and a.email like ?', [`%${email}%`])}
        ${this.setSql(status, 'and a.status = ?', [Number(status)])}
        ${this.setSql(
          isAdCustomer !== undefined &&
            isAdCustomer !== null &&
            isAdCustomer !== '',
          'and a.isAdCustomer = ?',
          [Number(isAdCustomer)]
        )}
        ${this.setSql(industry, 'and a.industry = ?', [industry])}
        ${this.setSql(
          keyword,
          "and (a.companyName like ? or a.contactName like ? or a.mobile like ? or IFNULL(a.email,'') like ?)",
          [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
        )}
      ORDER BY a.createTime DESC
    `;
    // 禁止 sqlRenderPage 再追加 ORDER BY，否則會與上面的 ORDER BY 衝突導致 SQL 語法錯誤
    return this.sqlRenderPage(sql, query, false);
  }

  /**
   * 客戶列表分頁：已分配業務員；老闆看全部，業務員只看自己的
   */
  async pageAssigned(query: any) {
    await this.refreshAutoVipCustomers();
    const {
      companyName,
      contactName,
      mobile,
      email,
      keyword,
      salesmanId,
      industry,
      status,
      isVip,
      isAdCustomer,
    } = query;
    const scope = await this.getCustomerListScope();
    const customerListStatusSql = `
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM crm_quote_order qo
          WHERE qo.customerId = a.id
            AND qo.isDeleted = 0
        )
        AND NOT EXISTS (
          SELECT 1
          FROM crm_quote_order qo
          WHERE qo.customerId = a.id
            AND qo.isDeleted = 0
            AND qo.status <> 7
        )
        THEN 2
        ELSE 1
      END
    `;

    const sid =
      salesmanId !== undefined &&
      salesmanId !== null &&
      salesmanId !== '' &&
      !Number.isNaN(Number(salesmanId))
        ? Number(salesmanId)
        : null;
    const scopeUserIds = scope.scopedUserIds.length
      ? scope.scopedUserIds
      : [null];
    const managerFilterUserIds =
      sid != null
        ? scope.scopedUserIds.includes(sid)
          ? [sid]
          : [null]
        : scopeUserIds;

    const dealCountSql = `
      (
        SELECT COUNT(1)
        FROM crm_quote_order qo
        WHERE qo.customerId = a.id
          AND qo.isDeleted = 0
          AND qo.contractStatus = 1
      )
    `;
    const dealAmountSql = `
      (
        SELECT COALESCE(SUM(i.amount), 0)
        FROM crm_quote_invoice i
        INNER JOIN crm_quote_order qo ON qo.id = i.quoteOrderId
        WHERE qo.customerId = a.id
          AND qo.isDeleted = 0
          AND i.isDeleted = 0
          AND i.status = 2
      )
    `;

    const sql = `
      SELECT
        a.*,
        b.name AS salesmanName,
        ${customerListStatusSql} AS customerListStatus,
        ${dealCountSql} AS currentDealCount,
        ${dealAmountSql} AS currentDealAmount
      FROM crm_customer_info a
      LEFT JOIN base_sys_user b ON a.salesmanId = b.id
      WHERE a.isDeleted = 0
        AND a.salesmanId IS NOT NULL
        ${this.setSql(scope.isBoss && sid != null, 'and a.salesmanId = ?', [
          sid,
        ])}
        ${this.setSql(scope.isOfficeClerkManager, 'and a.salesmanId in (?)', [
          managerFilterUserIds,
        ])}
        ${this.setSql(
          !scope.isBoss && !scope.isOfficeClerkManager,
          'and a.salesmanId = ?',
          [scope.userId]
        )}
        ${this.setSql(companyName, 'and a.companyName like ?', [
          `%${companyName}%`,
        ])}
        ${this.setSql(contactName, 'and a.contactName like ?', [
          `%${contactName}%`,
        ])}
        ${this.setSql(mobile, 'and a.mobile like ?', [`%${mobile}%`])}
        ${this.setSql(email, 'and a.email like ?', [`%${email}%`])}
        ${this.setSql(
          isVip !== undefined && isVip !== null && isVip !== '',
          'and a.isVip = ?',
          [Number(isVip)]
        )}
        ${this.setSql(
          isAdCustomer !== undefined &&
            isAdCustomer !== null &&
            isAdCustomer !== '',
          'and a.isAdCustomer = ?',
          [Number(isAdCustomer)]
        )}
        ${this.setSql(industry, 'and a.industry = ?', [industry])}
        ${this.setSql(
          keyword,
          "and (a.companyName like ? or a.contactName like ? or a.mobile like ? or IFNULL(a.email,'') like ? or IFNULL(b.name,'') like ?)",
          [
            `%${keyword}%`,
            `%${keyword}%`,
            `%${keyword}%`,
            `%${keyword}%`,
            `%${keyword}%`,
          ]
        )}
      HAVING 1 = 1
        ${this.setSql(status, 'and customerListStatus = ?', [Number(status)])}
      ORDER BY a.createTime DESC
    `;
    const result = await this.sqlRenderPage(sql, query, false);
    result.list = (Array.isArray(result.list) ? result.list : []).map(item => {
      const { currentDealCount, currentDealAmount, ...row } = item;
      return {
        ...row,
        dealCount: Number(currentDealCount || 0),
        dealAmount: Number(currentDealAmount || 0),
        status: Number(item?.customerListStatus || 1),
      };
    });
    return result;
  }

  async add(param: any) {
    const boss = await this.isBoss();
    param.isDeleted = 0;
    param.isAdCustomer = Number(param.isAdCustomer) === 1 ? 1 : 0;
    if (boss) {
      const raw = param.salesmanId;
      if (
        raw !== undefined &&
        raw !== null &&
        raw !== '' &&
        !Number.isNaN(Number(raw))
      ) {
        const sid = Number(raw);
        await this.ensureSalesmanRole(sid);
        param.salesmanId = sid;
      } else {
        param.salesmanId = null;
      }
      param.isVip = 0;
    } else {
      param.salesmanId = this.ctx.admin.userId;
      delete param.isVip;
    }
    await this.crmCustomerInfoEntity.save(param);
    return param.id;
  }

  async update(param: any) {
    const row = await this.crmCustomerInfoEntity.findOneBy({
      id: param.id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('記錄不存在');
    }
    const boss = await this.isBoss();
    delete param.salesmanId;
    if (param.isAdCustomer !== undefined && param.isAdCustomer !== null) {
      param.isAdCustomer = Number(param.isAdCustomer) === 1 ? 1 : 0;
    } else {
      delete param.isAdCustomer;
    }
    if (!boss) {
      delete param.isVip;
    } else {
      if (param.isVip !== undefined && param.isVip !== null) {
        param.isVip = Number(param.isVip) === 1 ? 1 : 0;
      } else {
        delete param.isVip;
      }
    }
    await this.crmCustomerInfoEntity.save({
      ...param,
      isDeleted: 0,
    });
  }

  /**
   * 批次匯入（老闆：公池；業務員：歸自己）
   */
  async importRows(rows: Partial<CrmCustomerInfoEntity>[]) {
    const boss = await this.isBoss();
    const uid = this.ctx.admin.userId;
    rows.forEach((row, index) =>
      this.validateImportRequiredFields(row, index + 2)
    );
    const list = rows.map(r => ({
      companyName: r.companyName ?? null,
      address: r.address ?? null,
      taxNumber: r.taxNumber ?? null,
      remittanceLast5: r.remittanceLast5 ?? null,
      contactName: r.contactName ?? null,
      mobile: r.mobile ?? null,
      email: r.email ?? null,
      remark: r.remark ?? null,
      industry: null,
      isVip: boss ? (Number(r.isVip) === 1 ? 1 : 0) : 0,
      isAdCustomer: Number(r.isAdCustomer) === 1 ? 1 : 0,
      salesmanId: boss ? null : uid,
      isDeleted: 0,
    }));
    await this.crmCustomerInfoEntity.save(list);
    return list.length;
  }

  /** 校驗使用者是否為可接客戶的業務員角色且啟用 */
  private async ensureSalesmanRole(salesmanId: number) {
    const user = await this.baseSysUserEntity.findOneBy({ id: salesmanId });
    if (!user || user.status !== 1) {
      throw new CoolCommException('業務員不存在或已停用');
    }
    const roleOk = await this.nativeQuery(
      `
      SELECT ur.userId FROM base_sys_user_role ur
      INNER JOIN base_sys_role r ON r.id = ur.roleId AND r.label = ?
      WHERE ur.userId = ? LIMIT 1
    `,
      [SALESMAN_ROLE_LABEL, salesmanId]
    );
    if (!roleOk?.length) {
      throw new CoolCommException('只能選擇業務員角色的使用者');
    }
  }

  /**
   * 客戶列表匯入：行業預設空、VIP 預設否、業務員預設當前匯入人
   */
  async importListRows(
    rows: Partial<CrmCustomerInfoEntity>[]
  ) {
    const boss = await this.isBoss();
    const salesman = await this.isSalesman();
    if (!boss && !salesman) {
      throw new CoolCommException('僅老闆或業務員可匯入客戶列表');
    }
    const uid = this.ctx.admin.userId;
    const list: Partial<CrmCustomerInfoEntity>[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const excelRow = i + 2;
      this.validateImportRequiredFields(r, excelRow);
      list.push({
        companyName: r.companyName ?? null,
        address: r.address ?? null,
        taxNumber: r.taxNumber ?? null,
        remittanceLast5: r.remittanceLast5 ?? null,
        contactName: r.contactName ?? null,
        mobile: r.mobile ?? null,
        email: r.email ?? null,
        remark: r.remark ?? null,
        industry: null,
        isVip: 0,
        isAdCustomer: Number(r.isAdCustomer) === 1 ? 1 : 0,
        salesmanId: uid,
        isDeleted: 0,
      });
    }
    await this.crmCustomerInfoEntity.save(list);
    return list.length;
  }

  private validateImportRequiredFields(
    row: Partial<CrmCustomerInfoEntity>,
    excelRow: number
  ) {
    const requiredFields = [
      { prop: 'companyName', label: '公司名稱' },
      { prop: 'address', label: '地址' },
      { prop: 'taxNumber', label: '統一編號' },
      { prop: 'remittanceLast5', label: '匯款本公司' },
      { prop: 'contactName', label: '聯絡人' },
      { prop: 'mobile', label: '手機號' },
      { prop: 'email', label: '郵箱' },
    ];
    const missing = requiredFields
      .filter(item => String(row?.[item.prop] ?? '').trim() === '')
      .map(item => item.label);

    if (missing.length > 0) {
      throw new CoolCommException(
        `第 ${excelRow} 行：請填寫${missing.join('、')}`
      );
    }
  }

  /**
   * 老闆分配業務員（僅公池資料）
   */
  async assignSalesman(id: number, salesmanId: number) {
    const boss = await this.isBoss();
    if (!boss) {
      throw new CoolCommException('僅老闆可分配業務員');
    }
    const row = await this.crmCustomerInfoEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('記錄不存在');
    }
    if (row.salesmanId != null) {
      throw new CoolCommException('該客戶已分配業務員');
    }
    await this.ensureSalesmanRole(salesmanId);
    await this.crmCustomerInfoEntity.update({ id }, { salesmanId });
  }

  async sendPoolMail(param: any) {
    const id = Number(param?.id || 0);
    const row = await this.crmCustomerInfoEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('客戶不存在');
    }
    if (row.salesmanId != null) {
      throw new CoolCommException('該客戶不在客戶公池');
    }
    const email = String(row.email || '').trim();
    if (!email) {
      throw new CoolCommException('該客戶暫無郵箱');
    }

    const mail = await this.crmMailService.buildTemplateMail({
      key: 'crmCustomerMailTemplate',
      fallbackSubject: `${row.companyName || row.contactName || '客戶'}郵件溝通`,
      fallbackHtml: this.buildCustomerMailHtml(row),
      fallbackText: `${row.companyName || row.contactName || '客戶'}郵件溝通`,
      variables: this.buildCustomerMailVariables(row),
    });
    await this.crmMailService.send({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return { id, email };
  }

  /**
   * 移入公池：清空業務員（老闆或當前歸屬業務員可操作）
   */
  async moveToPool(id: number) {
    const row = await this.crmCustomerInfoEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('記錄不存在');
    }
    if (row.salesmanId == null) {
      throw new CoolCommException('該客戶已在公池');
    }
    const boss = await this.isBoss();
    const uid = this.ctx.admin.userId;
    if (!boss && row.salesmanId !== uid) {
      throw new CoolCommException('無權限操作');
    }
    await this.crmCustomerInfoEntity.update({ id }, { salesmanId: null });
  }

  /**
   * 設為 VIP（僅超管/老闆類角色）
   */
  async setVipCustomer(id: number) {
    const boss = await this.isBoss();
    if (!boss) {
      throw new CoolCommException('僅管理員可設定VIP');
    }
    const row = await this.crmCustomerInfoEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('記錄不存在');
    }
    await this.crmCustomerInfoEntity.update({ id }, { isVip: 1 });
  }

  /**
   * PDF規則：客戶累計開票金額大於150萬自動成為VIP。
   * 只自動置為VIP，不自動取消，避免覆蓋老闆手動設定。
   */
  async refreshAutoVipByCustomerId(customerId: number) {
    const id = Number(customerId || 0);
    if (!id) {
      return { customerId: id, invoiceAmount: 0, isVip: 0 };
    }
    const rows = await this.nativeQuery(
      `
      SELECT COALESCE(SUM(i.amount), 0) AS invoiceAmount
      FROM crm_quote_invoice i
      INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId
      WHERE i.isDeleted = 0
        AND i.status = 2
        AND q.isDeleted = 0
        AND q.customerId = ?
      `,
      [id]
    );
    const invoiceAmount = this.toMoney(rows?.[0]?.invoiceAmount || 0);
    if (invoiceAmount > this.AUTO_VIP_INVOICE_AMOUNT) {
      await this.crmCustomerInfoEntity.update(
        { id, isDeleted: 0 },
        { isVip: 1 }
      );
      return { customerId: id, invoiceAmount, isVip: 1 };
    }
    return { customerId: id, invoiceAmount, isVip: 0 };
  }

  async refreshAutoVipByQuoteOrderId(quoteOrderId: number) {
    const id = Number(quoteOrderId || 0);
    if (!id) {
      return null;
    }
    const rows = await this.nativeQuery(
      `
      SELECT customerId
      FROM crm_quote_order
      WHERE id = ?
        AND isDeleted = 0
      LIMIT 1
      `,
      [id]
    );
    const customerId = Number(rows?.[0]?.customerId || 0);
    return customerId ? await this.refreshAutoVipByCustomerId(customerId) : null;
  }

  /**
   * 取消 VIP（僅超管/老闆類角色）
   */
  async cancelVipCustomer(id: number) {
    const boss = await this.isBoss();
    if (!boss) {
      throw new CoolCommException('僅管理員可操作');
    }
    const row = await this.crmCustomerInfoEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('記錄不存在');
    }
    await this.crmCustomerInfoEntity.update({ id }, { isVip: 0 });
  }

  async delete(ids: number[] | number) {
    const idArr = Array.isArray(ids)
      ? ids.map(e => Number(e)).filter(e => !Number.isNaN(e))
      : [Number(ids)].filter(e => !Number.isNaN(e));
    if (idArr.length === 0) {
      return;
    }
    await this.crmCustomerInfoEntity.update(
      { id: In(idArr) },
      { isDeleted: 1 }
    );
  }

  async info(id: number | string) {
    return this.crmCustomerInfoEntity.findOneBy({
      id: Number(id),
      isDeleted: 0,
    });
  }

  private async refreshAutoVipCustomers() {
    await this.nativeQuery(
      `
      UPDATE crm_customer_info c
      INNER JOIN (
        SELECT q.customerId, COALESCE(SUM(i.amount), 0) AS invoiceAmount
        FROM crm_quote_invoice i
        INNER JOIN crm_quote_order q ON q.id = i.quoteOrderId
        WHERE i.isDeleted = 0
          AND i.status = 2
          AND q.isDeleted = 0
        GROUP BY q.customerId
        HAVING invoiceAmount > ?
      ) s ON s.customerId = c.id
      SET c.isVip = 1
      WHERE c.isDeleted = 0
        AND c.isVip <> 1
      `,
      [this.AUTO_VIP_INVOICE_AMOUNT]
    );
  }

  private async getCustomerListScope(): Promise<CustomerListScope> {
    const userId = Number(this.ctx.admin?.userId || 0);
    const roleIds: number[] = this.ctx.admin?.roleIds || [];
    const roles = roleIds.length
      ? await this.baseSysRoleEntity.findBy({ id: In(roleIds) })
      : [];
    const roleLabels = roles.map(item => item.label);
    const isBoss = roleLabels.some(label =>
      this.SUPER_ROLE_LABELS.includes(label)
    );
    const isOfficeClerkManager =
      !isBoss && roleLabels.includes(this.INTERNAL_MANAGER_ROLE_LABEL);
    const scopedUserIds = isOfficeClerkManager
      ? await this.getCurrentDepartmentUserIds(userId)
      : [];

    return {
      userId,
      isBoss,
      isOfficeClerkManager,
      scopedUserIds,
    };
  }

  private async getCurrentDepartmentUserIds(userId: number): Promise<number[]> {
    const currentUser = await this.baseSysUserEntity.findOneBy({ id: userId });
    const currentDepartmentId = Number(currentUser?.departmentId || 0);
    if (!currentDepartmentId) {
      return [];
    }

    const departments = await this.baseSysDepartmentEntity.find();
    const departmentIds = new Set<number>([currentDepartmentId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const department of departments) {
        const id = Number(department.id || 0);
        const parentId = Number(department.parentId || 0);
        if (
          id &&
          parentId &&
          departmentIds.has(parentId) &&
          !departmentIds.has(id)
        ) {
          departmentIds.add(id);
          changed = true;
        }
      }
    }

    const users = await this.baseSysUserEntity.find({
      select: ['id'],
      where: {
        departmentId: In([...departmentIds]),
        status: 1,
      },
    });
    return users.map(item => Number(item.id)).filter(id => id > 0);
  }

  async list(query?: any) {
    return this.crmCustomerInfoEntity.find({
      where: {
        isDeleted: 0,
        salesmanId: IsNull(),
      },
      order: { createTime: 'DESC' },
    });
  }

  private toMoney(value: any) {
    const num = Number(value ?? 0);
    return Number.isNaN(num) ? 0 : Number(num.toFixed(2));
  }

  private buildCustomerMailHtml(row: CrmCustomerInfoEntity) {
    const escape = (value: any) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    return `
      <div style="font-family: Arial, 'Microsoft JhengHei', sans-serif; line-height: 1.8; color: #333;">
        <p>您好：</p>
        <p>以下為客戶資料，請查收。</p>
        <table cellpadding="8" cellspacing="0" style="border-collapse: collapse; min-width: 520px;">
          <tr><td style="border:1px solid #ddd;">公司名稱</td><td style="border:1px solid #ddd;">${escape(row.companyName)}</td></tr>
          <tr><td style="border:1px solid #ddd;">聯絡人</td><td style="border:1px solid #ddd;">${escape(row.contactName)}</td></tr>
          <tr><td style="border:1px solid #ddd;">手機號</td><td style="border:1px solid #ddd;">${escape(row.mobile)}</td></tr>
          <tr><td style="border:1px solid #ddd;">郵箱</td><td style="border:1px solid #ddd;">${escape(row.email)}</td></tr>
          <tr><td style="border:1px solid #ddd;">地址</td><td style="border:1px solid #ddd;">${escape(row.address)}</td></tr>
        </table>
      </div>
    `;
  }

  private buildCustomerMailVariables(row: CrmCustomerInfoEntity) {
    return {
      companyName: row.companyName || '',
      contactName: row.contactName || '',
      mobile: row.mobile || '',
      email: row.email || '',
      address: row.address || '',
      taxNumber: row.taxNumber || '',
      remittanceLast5: row.remittanceLast5 || '',
      remark: row.remark || '',
      industry: row.industry || '',
      isVip: Number(row.isVip || 0) === 1 ? 'VIP' : '普通',
      isAdCustomer: Number(row.isAdCustomer || 0) === 1 ? '是' : '否',
    };
  }
}
