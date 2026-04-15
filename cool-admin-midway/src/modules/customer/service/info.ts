import { InjectEntityModel } from '@midwayjs/typeorm';
import { Provide, Inject } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { CrmCustomerInfoEntity } from '../entity/info';
import { Equal, In, IsNull, Repository } from 'typeorm';
import { Context } from '@midwayjs/koa';
import { BaseSysPermsService } from '../../base/service/sys/perms';
import { BaseSysUserEntity } from '../../base/entity/sys/user';

/** 可分配客户的用户须具备的角色标识（base_sys_role.label），与后台角色配置一致 */
export const SALESMAN_ROLE_LABEL = 'salesperson';

@Provide()
export class CrmCustomerInfoService extends BaseService {
  @InjectEntityModel(CrmCustomerInfoEntity)
  crmCustomerInfoEntity: Repository<CrmCustomerInfoEntity>;

  @InjectEntityModel(BaseSysUserEntity)
  baseSysUserEntity: Repository<BaseSysUserEntity>;

  @Inject()
  ctx: Context;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  async isBoss(): Promise<boolean> {
    const roleIds = this.ctx.admin?.roleIds || [];
    return this.baseSysPermsService.isAdmin(roleIds);
  }

  /**
   * 分配客户时可选择的用户：启用状态且拥有业务员角色（role.label = salesperson）
   */
  async listSalesmenForAssign(): Promise<
    Pick<BaseSysUserEntity, 'id' | 'name' | 'nickName' | 'username'>[]
  > {
    const boss = await this.isBoss();
    if (!boss) {
      throw new CoolCommException('无权限');
    }
    const rows = await this.nativeQuery(
      `
      SELECT DISTINCT a.id, a.name, a.nickName, a.username
      FROM base_sys_user a
      INNER JOIN base_sys_user_role ur ON ur.userId = a.id
      INNER JOIN base_sys_role r ON r.id = ur.roleId AND r.label = ?
      WHERE a.status = 1 AND a.username != 'admin'
      ORDER BY a.id ASC
    `,
      [SALESMAN_ROLE_LABEL]
    );
    return rows || [];
  }

  /**
   * 客户公池分页：仅未分配业务员
   */
  async page(query: any) {
    const { companyName, contactName, mobile, email, keyword, industry } = query;
    const sql = `
      SELECT a.*
      FROM crm_customer_info a
      WHERE a.isDeleted = 0
        AND a.salesmanId IS NULL
        ${this.setSql(companyName, 'and a.companyName like ?', [`%${companyName}%`])}
        ${this.setSql(contactName, 'and a.contactName like ?', [`%${contactName}%`])}
        ${this.setSql(mobile, 'and a.mobile like ?', [`%${mobile}%`])}
        ${this.setSql(email, 'and a.email like ?', [`%${email}%`])}
        ${this.setSql(industry, 'and a.industry = ?', [industry])}
        ${this.setSql(
          keyword,
          'and (a.companyName like ? or a.contactName like ? or a.mobile like ? or IFNULL(a.email,\'\') like ?)',
          [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
        )}
      ORDER BY a.createTime DESC
    `;
    // 禁止 sqlRenderPage 再追加 ORDER BY，否则会与上面的 ORDER BY 冲突导致 SQL 语法错误
    return this.sqlRenderPage(sql, query, false);
  }

  /**
   * 客户列表分页：已分配业务员；老板看全部，业务员只看自己的
   */
  async pageAssigned(query: any) {
    const { companyName, contactName, mobile, email, keyword, salesmanId, industry } =
      query;
    const userId = this.ctx.admin?.userId;
    const boss = await this.isBoss();

    const sid =
      salesmanId !== undefined &&
      salesmanId !== null &&
      salesmanId !== '' &&
      !Number.isNaN(Number(salesmanId))
        ? Number(salesmanId)
        : null;

    const sql = `
      SELECT a.*, b.name AS salesmanName
      FROM crm_customer_info a
      LEFT JOIN base_sys_user b ON a.salesmanId = b.id
      WHERE a.isDeleted = 0
        AND a.salesmanId IS NOT NULL
        ${this.setSql(!boss, 'and a.salesmanId = ?', [userId])}
        ${this.setSql(boss && sid != null, 'and a.salesmanId = ?', [sid])}
        ${this.setSql(companyName, 'and a.companyName like ?', [`%${companyName}%`])}
        ${this.setSql(contactName, 'and a.contactName like ?', [`%${contactName}%`])}
        ${this.setSql(mobile, 'and a.mobile like ?', [`%${mobile}%`])}
        ${this.setSql(email, 'and a.email like ?', [`%${email}%`])}
        ${this.setSql(industry, 'and a.industry = ?', [industry])}
        ${this.setSql(
          keyword,
          'and (a.companyName like ? or a.contactName like ? or a.mobile like ? or IFNULL(a.email,\'\') like ? or IFNULL(b.name,\'\') like ?)',
          [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
        )}
      ORDER BY a.createTime DESC
    `;
    return this.sqlRenderPage(sql, query, false);
  }

  async add(param: any) {
    const boss = await this.isBoss();
    param.isDeleted = 0;
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
      throw new CoolCommException('记录不存在');
    }
    const boss = await this.isBoss();
    delete param.salesmanId;
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
   * 批量导入（老板：公池；业务员：归自己）
   */
  async importRows(rows: Partial<CrmCustomerInfoEntity>[]) {
    const boss = await this.isBoss();
    const uid = this.ctx.admin.userId;
    const list = rows.map(r => ({
      companyName: r.companyName ?? null,
      address: r.address ?? null,
      taxNumber: r.taxNumber ?? null,
      remittanceLast5: r.remittanceLast5 ?? null,
      contactName: r.contactName ?? null,
      mobile: r.mobile ?? null,
      email: r.email ?? null,
      remark: r.remark ?? null,
      industry: r.industry != null && String(r.industry).trim() !== '' ? String(r.industry).trim() : null,
      isVip: boss ? (Number(r.isVip) === 1 ? 1 : 0) : 0,
      salesmanId: boss ? null : uid,
      isDeleted: 0,
    }));
    await this.crmCustomerInfoEntity.save(list);
    return list.length;
  }

  /** 校验用户是否为可接客户的业务员角色且启用 */
  private async ensureSalesmanRole(salesmanId: number) {
    const user = await this.baseSysUserEntity.findOneBy({ id: salesmanId });
    if (!user || user.status !== 1) {
      throw new CoolCommException('业务员不存在或已禁用');
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
      throw new CoolCommException('只能选择业务员角色的用户');
    }
  }

  /**
   * 老板导入列表：业务员账号选填；不填则进公池。填则按系统用户名（或纯数字用户 ID）解析业务员。
   */
  private async resolveBossListImportSalesman(
    r: Partial<CrmCustomerInfoEntity> & { salesmanUsername?: string },
    excelRow: number
  ): Promise<number | null> {
    const fromText =
      r.salesmanUsername != null && String(r.salesmanUsername).trim() !== ''
        ? String(r.salesmanUsername).trim()
        : '';
    if (!fromText && r.salesmanId != null && String(r.salesmanId).trim() !== '') {
      const sid = Number(r.salesmanId);
      if (!Number.isNaN(sid)) {
        await this.ensureSalesmanRole(sid);
        return sid;
      }
    }
    if (!fromText) {
      return null;
    }
    const byLogin = await this.baseSysUserEntity.findOne({
      where: { username: Equal(fromText), status: 1 },
    });
    if (byLogin) {
      await this.ensureSalesmanRole(byLogin.id);
      return byLogin.id;
    }
    if (/^-?\d+$/.test(fromText)) {
      const sid = Number(fromText);
      await this.ensureSalesmanRole(sid);
      return sid;
    }
    throw new CoolCommException(
      `第 ${excelRow} 行：业务员账号「${fromText}」不存在或不是可分配的业务员`
    );
  }

  /**
   * 客户列表导入：老板可填业务员账号（选填，不填进公池）；业务员导入归本人
   */
  async importListRows(
    rows: (Partial<CrmCustomerInfoEntity> & {
      salesmanId?: number;
      salesmanUsername?: string;
    })[]
  ) {
    const boss = await this.isBoss();
    const uid = this.ctx.admin.userId;
    const list: Partial<CrmCustomerInfoEntity>[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const excelRow = i + 2;
      let salesmanId: number | null;
      if (boss) {
        salesmanId = await this.resolveBossListImportSalesman(r, excelRow);
      } else {
        salesmanId = uid;
      }
      list.push({
        companyName: r.companyName ?? null,
        address: r.address ?? null,
        taxNumber: r.taxNumber ?? null,
        remittanceLast5: r.remittanceLast5 ?? null,
        contactName: r.contactName ?? null,
        mobile: r.mobile ?? null,
        email: r.email ?? null,
        remark: r.remark ?? null,
        industry:
          r.industry != null && String(r.industry).trim() !== ''
            ? String(r.industry).trim()
            : null,
        isVip: boss ? (Number(r.isVip) === 1 ? 1 : 0) : 0,
        salesmanId: salesmanId === null ? null : salesmanId,
        isDeleted: 0,
      });
    }
    await this.crmCustomerInfoEntity.save(list);
    return list.length;
  }

  /**
   * 老板分配业务员（仅公池数据）
   */
  async assignSalesman(id: number, salesmanId: number) {
    const boss = await this.isBoss();
    if (!boss) {
      throw new CoolCommException('仅老板可分配业务员');
    }
    const row = await this.crmCustomerInfoEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('记录不存在');
    }
    if (row.salesmanId != null) {
      throw new CoolCommException('该客户已分配业务员');
    }
    await this.ensureSalesmanRole(salesmanId);
    await this.crmCustomerInfoEntity.update({ id }, { salesmanId });
  }

  /**
   * 移入公池：清空业务员（老板或当前归属业务员可操作）
   */
  async moveToPool(id: number) {
    const row = await this.crmCustomerInfoEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('记录不存在');
    }
    if (row.salesmanId == null) {
      throw new CoolCommException('该客户已在公池');
    }
    const boss = await this.isBoss();
    const uid = this.ctx.admin.userId;
    if (!boss && row.salesmanId !== uid) {
      throw new CoolCommException('无权限操作');
    }
    await this.crmCustomerInfoEntity.update({ id }, { salesmanId: null });
  }

  /**
   * 设为 VIP（仅超管/老板类角色）
   */
  async setVipCustomer(id: number) {
    const boss = await this.isBoss();
    if (!boss) {
      throw new CoolCommException('仅管理员可设置VIP');
    }
    const row = await this.crmCustomerInfoEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('记录不存在');
    }
    await this.crmCustomerInfoEntity.update({ id }, { isVip: 1 });
  }

  /**
   * 取消 VIP（仅超管/老板类角色）
   */
  async cancelVipCustomer(id: number) {
    const boss = await this.isBoss();
    if (!boss) {
      throw new CoolCommException('仅管理员可操作');
    }
    const row = await this.crmCustomerInfoEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('记录不存在');
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

  async list(query?: any) {
    return this.crmCustomerInfoEntity.find({
      where: {
        isDeleted: 0,
        salesmanId: IsNull(),
      },
      order: { createTime: 'DESC' },
    });
  }
}
