import { InjectEntityModel } from '@midwayjs/typeorm';
import { Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { In, Repository } from 'typeorm';
import { CrmSupplierInfoEntity } from '../entity/info';

@Provide()
export class CrmSupplierInfoService extends BaseService {
  @InjectEntityModel(CrmSupplierInfoEntity)
  crmSupplierInfoEntity: Repository<CrmSupplierInfoEntity>;

  async page(query: any) {
    const { companyName, category, businessCategory, address, email, status } =
      query || {};
    const unifiedNo = String(query?.unifiedNo || query?.taxNumber || '').trim();

    const sql = `
      SELECT a.*
      FROM crm_supplier a
      WHERE a.isDeleted = 0
      ${this.setSql(companyName, 'and a.companyName like ?', [`%${companyName}%`])}
      ${this.setSql(category, 'and a.category = ?', [String(category)])}
      ${this.setSql(businessCategory, 'and a.businessCategory = ?', [String(businessCategory)])}
      ${this.setSql(unifiedNo, 'and a.unifiedNo like ?', [`%${unifiedNo}%`])}
      ${this.setSql(address, 'and a.address like ?', [`%${address}%`])}
      ${this.setSql(email, 'and a.email like ?', [`%${email}%`])}
      ${this.setSql(status !== undefined && status !== null, 'and a.status = ?', [Number(status)])}
      ORDER BY a.createTime DESC
    `;

    return this.sqlRenderPage(sql, query, false);
  }

  async add(param: Partial<CrmSupplierInfoEntity> & { taxNumber?: string }) {
    const data = this.normalizePayload(param);
    if (!data.companyName) {
      throw new CoolCommException('供應商公司名稱不能為空');
    }
    data.isDeleted = 0;
    const saved = await this.crmSupplierInfoEntity.save(data);
    return saved.id;
  }

  async update(param: Partial<CrmSupplierInfoEntity> & { taxNumber?: string }) {
    const data = this.normalizePayload(param);
    if (!data.companyName) {
      throw new CoolCommException('供應商公司名稱不能為空');
    }
    data.isDeleted = 0;
    await this.crmSupplierInfoEntity.save(data);
  }

  async delete(ids: number[] | number) {
    const idArr = this.toIdArray(ids);
    if (idArr.length === 0) {
      return;
    }
    await this.crmSupplierInfoEntity.update(
      { id: In(idArr) },
      { isDeleted: 1 }
    );
  }

  async info(id: number | string | { id: number }) {
    const supplierId = Number((id as any)?.id ?? id);
    return this.crmSupplierInfoEntity.findOneBy({
      id: supplierId,
      isDeleted: 0,
    });
  }

  async list() {
    return this.crmSupplierInfoEntity.find({
      where: { isDeleted: 0 },
      order: { createTime: 'DESC' },
    });
  }

  private normalizePayload(param: Partial<CrmSupplierInfoEntity> & { taxNumber?: string }) {
    return {
      ...param,
      companyName: this.toText(param.companyName),
      category: this.toNullableText(param.category),
      businessCategory: this.toNullableText((param as any).businessCategory),
      unifiedNo: this.toNullableText((param as any).unifiedNo ?? param.taxNumber),
      contactName: this.toNullableText((param as any).contactName),
      contactPhone: this.toNullableText((param as any).contactPhone),
      address: this.toNullableText(param.address),
      email: this.toNullableText(param.email),
      remark: this.toNullableText(param.remark),
      status: Number((param as any).status) === 0 ? 0 : 1,
    };
  }

  private toNullableText(value: any) {
    const text = `${value ?? ''}`.trim();
    return text || null;
  }

  private toText(value: any) {
    return `${value ?? ''}`.trim();
  }

  private toIdArray(ids: number[] | number) {
    if (Array.isArray(ids)) {
      return ids.map(e => Number(e)).filter(e => !Number.isNaN(e));
    }
    const id = Number(ids);
    return Number.isNaN(id) ? [] : [id];
  }
}
