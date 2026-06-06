import { InjectEntityModel } from '@midwayjs/typeorm';
import { Provide, Inject } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { CrmCustomerFollowupEntity } from '../entity/followup';
import { CrmQuoteOrderEntity } from '../entity/quoteOrder';
import { Repository } from 'typeorm';
import { Context } from '@midwayjs/koa';
import { BaseSysPermsService } from '../../base/service/sys/perms';
import { CrmQuoteOrderService } from './quoteOrder';

@Provide()
export class CrmCustomerFollowupService extends BaseService {
  @InjectEntityModel(CrmCustomerFollowupEntity)
  crmCustomerFollowupEntity: Repository<CrmCustomerFollowupEntity>;

  @InjectEntityModel(CrmQuoteOrderEntity)
  crmQuoteOrderEntity: Repository<CrmQuoteOrderEntity>;

  @Inject()
  ctx: Context;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  @Inject()
  crmQuoteOrderService: CrmQuoteOrderService;

  async isBoss(): Promise<boolean> {
    const roleIds = this.ctx.admin?.roleIds || [];
    return this.baseSysPermsService.isAdmin(roleIds);
  }

  async assertQuoteAccess(quoteId: number) {
    const row = await this.crmQuoteOrderEntity.findOneBy({
      id: quoteId,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('報價單不存在');
    }

    const boss = await this.isBoss();
    const uid = Number(this.ctx.admin?.userId || 0);
    if (boss || Number(row.salesmanId || 0) === uid) {
      return row;
    }

    try {
      await this.crmQuoteOrderService.info(quoteId);
    } catch (error) {
      throw new CoolCommException('無權限檢視該報價單跟進記錄');
    }

    return row;
  }

  async page(query: any) {
    const quoteId = Number(query.quoteId || 0);
    if (!quoteId || Number.isNaN(quoteId)) {
      throw new CoolCommException('缺少報價單ID');
    }

    const quote = await this.assertQuoteAccess(quoteId);
    const boss = await this.isBoss();
    const uid = Number(this.ctx.admin?.userId || 0);
    const {
      keyword,
      followTimeMin,
      followTimeMax,
      nextFollowTimeMin,
      nextFollowTimeMax,
    } = query || {};

    let salesmanId = Number(query.salesmanId || quote.salesmanId || uid || 0);
    if (Number.isNaN(salesmanId) || salesmanId <= 0) {
      salesmanId = Number(quote.salesmanId || uid || 0);
    }
    if (!boss && Number(quote.salesmanId || 0) === uid) {
      salesmanId = uid;
    }

    const sql = `
      SELECT *
      FROM crm_customer_followup
      WHERE isDeleted = 0
        ${this.setSql(true, 'and quoteId = ?', [quoteId])}
        ${this.setSql(salesmanId > 0, 'and salesmanId = ?', [salesmanId])}
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
    const quoteId = Number(param.quoteId || 0);
    if (!quoteId || Number.isNaN(quoteId)) {
      throw new CoolCommException('缺少報價單ID');
    }

    const quote = await this.assertQuoteAccess(quoteId);
    const uid = Number(this.ctx.admin?.userId || 0);
    const followSalesmanId = Number(
      param.salesmanId || quote.salesmanId || uid || 0
    );

    param.isDeleted = 0;
    param.customerId = Number(quote.customerId || 0);
    param.quoteId = quoteId;
    param.salesmanId = Number.isNaN(followSalesmanId) ? null : followSalesmanId;

    await this.crmCustomerFollowupEntity.save(param);
    return param.id;
  }
}
