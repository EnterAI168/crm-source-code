import { InjectEntityModel } from '@midwayjs/typeorm';
import { Provide, Inject } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { CrmCustomerFollowupEntity } from '../entity/followup';
import { CrmCustomerInfoEntity } from '../entity/info';
import { Repository } from 'typeorm';
import { Context } from '@midwayjs/koa';
import { BaseSysPermsService } from '../../base/service/sys/perms';

@Provide()
export class CrmCustomerFollowupService extends BaseService {
  @InjectEntityModel(CrmCustomerFollowupEntity)
  crmCustomerFollowupEntity: Repository<CrmCustomerFollowupEntity>;

  @InjectEntityModel(CrmCustomerInfoEntity)
  crmCustomerInfoEntity: Repository<CrmCustomerInfoEntity>;

  @Inject()
  ctx: Context;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  async isBoss(): Promise<boolean> {
    const roleIds = this.ctx.admin?.roleIds || [];
    return this.baseSysPermsService.isAdmin(roleIds);
  }

  /**
   * 校验当前用户是否可查看/操作该客户（已分配列表中的客户）
   */
  async assertCustomerAccess(customerId: number) {
    const row = await this.crmCustomerInfoEntity.findOneBy({
      id: customerId,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('客户不存在');
    }
    if (!row.salesmanId) {
      throw new CoolCommException('客户不在已分配列表');
    }
    const boss = await this.isBoss();
    const uid = this.ctx.admin.userId;
    if (!boss && row.salesmanId !== uid) {
      throw new CoolCommException('无权限操作该客户');
    }
  }

  /**
   * 跟进记录分页（须带 customerId），支持关键字与时间范围
   */
  async page(query: any) {
    const customerId = Number(query.customerId);
    if (!customerId || Number.isNaN(customerId)) {
      throw new CoolCommException('缺少客户ID');
    }
    await this.assertCustomerAccess(customerId);

    const {
      keyword,
      followTimeMin,
      followTimeMax,
      nextFollowTimeMin,
      nextFollowTimeMax,
    } = query;

    const sql = `
      SELECT *
      FROM crm_customer_followup
      WHERE isDeleted = 0
        ${this.setSql(true, 'and customerId = ?', [customerId])}
        ${this.setSql(keyword, 'and (content like ? or remark like ?)', [`%${keyword}%`, `%${keyword}%`])}
        ${this.setSql(followTimeMin, 'and followTime >= ?', [followTimeMin])}
        ${this.setSql(followTimeMax, 'and followTime <= ?', [followTimeMax])}
        ${this.setSql(nextFollowTimeMin, 'and nextFollowTime >= ?', [nextFollowTimeMin])}
        ${this.setSql(nextFollowTimeMax, 'and nextFollowTime <= ?', [nextFollowTimeMax])}
      ORDER BY followTime DESC, id DESC
    `;
    return this.sqlRenderPage(sql, query, false);
  }

  async add(param: any) {
    const customerId = Number(param.customerId);
    if (!customerId || Number.isNaN(customerId)) {
      throw new CoolCommException('缺少客户ID');
    }
    await this.assertCustomerAccess(customerId);
    param.isDeleted = 0;
    param.customerId = customerId;
    await this.crmCustomerFollowupEntity.save(param);
    return param.id;
  }
}
