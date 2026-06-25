import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Inject, Provide } from '@midwayjs/core';
import { Repository } from 'typeorm';
import { CrmQuoteOrderEntity } from '../../customer/entity/quoteOrder';
import { CrmQuoteOrderService } from '../../customer/service/quoteOrder';

@Provide()
export class ProductProjectService extends BaseService {
  @InjectEntityModel(CrmQuoteOrderEntity)
  crmQuoteOrderEntity: Repository<CrmQuoteOrderEntity>;

  @Inject()
  crmQuoteOrderService: CrmQuoteOrderService;

  async page(query: any) {
    const scope = await this.crmQuoteOrderService.getScope();
    const restrictSql = this.crmQuoteOrderService.buildPageScopeSql(scope);
    const { quoteNo, quoteName, customerCompanyName, salesmanName } = query || {};

    const sql = `
      SELECT
        a.id,
        a.quoteNo,
        a.quoteName,
        a.customerId,
        a.salesmanId,
        a.accompanySalesmanId,
        a.startDate,
        a.endDate,
        a.finalAmount,
        a.projectStatus,
        a.projectStatusImages,
        a.projectCueSheet,
        a.createTime,
        c.companyName AS customerCompanyName,
        u.name AS salesmanName,
        u2.name AS accompanySalesmanName
      FROM crm_quote_order a
      LEFT JOIN crm_customer_info c ON c.id = a.customerId
      LEFT JOIN base_sys_user u ON u.id = a.salesmanId
      LEFT JOIN base_sys_user u2 ON u2.id = a.accompanySalesmanId
      WHERE a.isDeleted = 0
        AND a.auditStatus = 2
        ${restrictSql.sql}
        ${this.setSql(quoteNo, 'and a.quoteNo like ?', [`%${quoteNo}%`])}
        ${this.setSql(quoteName, 'and a.quoteName like ?', [`%${quoteName}%`])}
        ${this.setSql(customerCompanyName, 'and c.companyName like ?', [
          `%${customerCompanyName}%`,
        ])}
        ${this.setSql(salesmanName, 'and u.name like ?', [`%${salesmanName}%`])}
      ORDER BY a.createTime DESC, a.id DESC
    `;

    const result: any = await this.sqlRenderPage(
      sql,
      { ...query, ...restrictSql.params },
      false
    );

    result.list = (result.list || []).map((item: any) => ({
      ...item,
      projectStatusImages: this.normalizeImages(item?.projectStatusImages),
    }));

    return result;
  }

  async info(id: number | string | { id: number }) {
    const quoteOrderId = Number((id as any)?.id ?? id);
    if (!quoteOrderId) {
      return null;
    }

    const scope = await this.crmQuoteOrderService.getScope();
    const restrictSql = this.crmQuoteOrderService.buildPageScopeSql(scope);
    const rows = await this.nativeQuery(
      `
      SELECT
        a.id,
        a.quoteNo,
        a.quoteName,
        a.customerId,
        a.salesmanId,
        a.accompanySalesmanId,
        a.startDate,
        a.endDate,
        a.finalAmount,
        a.projectStatus,
        a.projectStatusImages,
        a.projectCueSheet,
        a.createTime,
        c.companyName AS customerCompanyName,
        u.name AS salesmanName,
        u2.name AS accompanySalesmanName
      FROM crm_quote_order a
      LEFT JOIN crm_customer_info c ON c.id = a.customerId
      LEFT JOIN base_sys_user u ON u.id = a.salesmanId
      LEFT JOIN base_sys_user u2 ON u2.id = a.accompanySalesmanId
      WHERE a.id = ?
        AND a.isDeleted = 0
        AND a.auditStatus = 2
        ${restrictSql.sql}
      LIMIT 1
    `,
      [quoteOrderId]
    );

    const row = rows?.[0];
    if (!row) {
      return null;
    }

    return {
      ...row,
      projectStatusImages: this.normalizeImages(row?.projectStatusImages),
    };
  }

  async update(param: any) {
    const id = Number(param?.id || 0);
    if (!id) {
      throw new CoolCommException('項目資料不存在');
    }

    const scope = await this.crmQuoteOrderService.getScope();
    const restrictSql = this.crmQuoteOrderService.buildPageScopeSql(scope);
    const rows = await this.nativeQuery(
      `
      SELECT a.id
      FROM crm_quote_order a
      WHERE a.id = ?
        AND a.isDeleted = 0
        AND a.auditStatus = 2
        ${restrictSql.sql}
      LIMIT 1
    `,
      [id]
    );

    if (!rows?.length) {
      throw new CoolCommException('沒有權限操作此項目');
    }

    await this.crmQuoteOrderEntity.update(
      { id, isDeleted: 0 },
      {
        projectStatus: this.toNullableText(param?.projectStatus),
        projectStatusImages: this.normalizeImages(param?.projectStatusImages),
        projectCueSheet: this.toNullableText(param?.projectCueSheet),
      }
    );
  }

  private normalizeImages(value: any) {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .map(item => String(item || '').trim())
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return this.normalizeImages(parsed);
      } catch {
        return value
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  private toNullableText(value: any) {
    const text = String(value || '').trim();
    return text || null;
  }
}
