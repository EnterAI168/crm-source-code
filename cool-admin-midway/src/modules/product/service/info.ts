import { InjectEntityModel } from '@midwayjs/typeorm';
import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { ProductInfoEntity } from '../entity/info';
import { BaseSysDepartmentEntity } from '../../base/entity/sys/department';
import { ProductCategoryEntity } from '../entity/category';
import { ProductSpecEntity } from '../entity/spec';
import { In, Repository } from 'typeorm';

/**
 * 產品資訊
 */
@Provide()
export class ProductInfoService extends BaseService {
  @InjectEntityModel(ProductInfoEntity)
  productInfoEntity: Repository<ProductInfoEntity>;

  @InjectEntityModel(BaseSysDepartmentEntity)
  baseSysDepartmentEntity: Repository<BaseSysDepartmentEntity>;

  @InjectEntityModel(ProductCategoryEntity)
  productCategoryEntity: Repository<ProductCategoryEntity>;

  @InjectEntityModel(ProductSpecEntity)
  productSpecEntity: Repository<ProductSpecEntity>;

  async page(query) {
    const {
      name,
      specName,
      categoryId,
      createTimeStartTime,
      createTimeEndTime,
    } = query;
    const sql = `
      SELECT
        a.*
      FROM product_info a
      WHERE a.isDeleted = 0
      ${this.setSql(name, 'and a.name like ?', [`%${name}%`])}
      ${this.setSql(categoryId, 'and a.categoryId = ?', [categoryId])}
      ${this.setSql(
        specName,
        `and exists (
          select 1
          from product_spec s
          where s.productId = a.id
            and s.isDeleted = 0
            and s.name like ?
        )`,
        [`%${specName}%`]
      )}
      ${this.setSql(createTimeStartTime, 'and a.createTime >= ?', [createTimeStartTime])}
      ${this.setSql(createTimeEndTime, 'and a.createTime <= ?', [createTimeEndTime])}
    `;
    return this.sqlRenderPage(sql, query);
  }

  async add(param) {
    const specs = this.normalizeSpecs(param.specs);
    const data = this.normalizePayload(param, this.calcSpecSummary(specs));
    delete data.specs;
    data.isDeleted = 0;
    const saved = await this.productInfoEntity.save(data);
    await this.saveSpecs(saved.id, specs);
    return saved.id;
  }

  async update(param) {
    const id = Number(param.id);
    const specs = this.normalizeSpecs(param.specs);
    const data = this.normalizePayload(param, this.calcSpecSummary(specs));
    delete data.specs;
    data.isDeleted = 0;
    await this.productInfoEntity.save(data);
    await this.syncSpecs(id, specs);
  }

  async info(id: number | { id: number }) {
    const productId = Number((id as any)?.id ?? id);
    const info = await this.productInfoEntity.findOneBy({
      id: productId,
      isDeleted: 0,
    });
    if (!info) {
      return null;
    }
    const specs = await this.productSpecEntity.find({
      where: { productId, isDeleted: 0 },
      order: { orderNum: 'ASC', id: 'ASC' },
    });
    return {
      ...info,
      specs,
    };
  }

  async delete(ids: number[] | number) {
    const idArr = this.toIdArray(ids);
    if (idArr.length > 0) {
      await this.productSpecEntity.update(
        { productId: In(idArr) },
        { isDeleted: 1 }
      );
      await this.productInfoEntity.update({ id: In(idArr) }, { isDeleted: 1 });
    }
  }

  private toNumber(value: any) {
    const n = Number(value ?? 0);
    return Number.isNaN(n) ? 0 : n;
  }

  private normalizePayload(param: any, summary?: any) {
    const price = this.toNumber(summary?.price ?? param.price);
    const costPrice = this.toNumber(summary?.costPrice ?? param.costPrice);
    const grossProfit = this.toNumber(summary?.grossProfit ?? (price - costPrice));
    const grossProfitRate = this.toNumber(
      summary?.grossProfitRate ?? (price > 0 ? grossProfit / price : 0)
    );

    return {
      ...param,
      logo: this.normalizeLogo(param.logo),
      price,
      costPrice,
      grossProfit,
      grossProfitRate,
      images: this.normalizeImages(param.images),
      isOneTimePayment: Number(param.isOneTimePayment) === 1 ? 1 : 0,
    };
  }

  private calcSpecSummary(specs: any[]) {
    const totalPrice = (specs || []).reduce((sum, item) => {
      return sum + this.toNumber(item?.price);
    }, 0);
    const totalCostPrice = (specs || []).reduce((sum, item) => {
      return sum + this.toNumber(item?.costPrice);
    }, 0);
    const grossProfit = totalPrice - totalCostPrice;
    const grossProfitRate = totalPrice > 0 ? grossProfit / totalPrice : 0;

    return {
      price: this.toNumber(totalPrice),
      costPrice: this.toNumber(totalCostPrice),
      grossProfit: this.toNumber(grossProfit),
      grossProfitRate: this.toNumber(grossProfitRate),
    };
  }

  private normalizeSpecs(specs: any[]) {
    if (!Array.isArray(specs)) {
      return [];
    }

    return specs.map((item, index) => {
      const specId = Number(item?.id);
      const price = this.toNumber(item?.price);
      const costPrice = this.toNumber(item?.costPrice);
      const grossProfit = price - costPrice;
      const grossProfitRate = price > 0 ? grossProfit / price : 0;

      return {
        id: Number.isNaN(specId) || specId <= 0 ? undefined : specId,
        productId: 0,
        image: this.normalizeImages(item?.image),
        name: item?.name || '',
        price,
        costPrice,
        grossProfit,
        grossProfitRate,
        remark: item?.remark || '',
        orderNum: this.toNumber(item?.orderNum) || index + 1,
        isDeleted: 0,
      };
    });
  }

  private async saveSpecs(productId: number, specs: any[]) {
    if (!productId || specs.length === 0) {
      return;
    }
    await this.productSpecEntity.save(
      specs.map(item => ({
        ...item,
        productId,
      }))
    );
  }

  private async syncSpecs(productId: number, specs: any[]) {
    if (!productId) {
      return;
    }

    const existing = await this.productSpecEntity.find({
      where: { productId, isDeleted: 0 },
      order: { id: 'ASC' },
    });

    const existingMap = new Map<number, ProductSpecEntity>();
    for (const row of existing) {
      existingMap.set(Number(row.id), row);
    }

    const incomingIds = new Set<number>();
    const toInsert: any[] = [];

    for (const item of specs) {
      const specId = Number(item?.id);
      const hasValidId = !Number.isNaN(specId) && specId > 0;

      if (hasValidId && existingMap.has(specId)) {
        incomingIds.add(specId);
        const oldRow = existingMap.get(specId);
        const patch = this.pickSpecPatch(oldRow, item);
        if (Object.keys(patch).length > 0) {
          await this.productSpecEntity.update({ id: specId, productId }, patch);
        }
      } else {
        toInsert.push({
          ...item,
          id: undefined,
          productId,
          isDeleted: 0,
        });
      }
    }

    const deleteIds = existing
      .map(e => Number(e.id))
      .filter(specId => !incomingIds.has(specId));

    if (deleteIds.length > 0) {
      await this.productSpecEntity.update(
        { id: In(deleteIds), productId },
        { isDeleted: 1 }
      );
    }

    if (toInsert.length > 0) {
      await this.productSpecEntity.save(toInsert);
    }
  }

  private pickSpecPatch(oldRow: ProductSpecEntity, nextRow: any) {
    const patch: any = {};
    const oldImages = this.normalizeImages(oldRow?.image);
    const nextImages = this.normalizeImages(nextRow?.image);

    if (JSON.stringify(oldImages) !== JSON.stringify(nextImages)) {
      patch.image = nextImages;
    }
    if ((oldRow?.name || '') !== (nextRow?.name || '')) {
      patch.name = nextRow?.name || '';
    }
    if (this.toNumber(oldRow?.price) !== this.toNumber(nextRow?.price)) {
      patch.price = this.toNumber(nextRow?.price);
    }
    if (this.toNumber(oldRow?.costPrice) !== this.toNumber(nextRow?.costPrice)) {
      patch.costPrice = this.toNumber(nextRow?.costPrice);
    }
    if (this.toNumber(oldRow?.grossProfit) !== this.toNumber(nextRow?.grossProfit)) {
      patch.grossProfit = this.toNumber(nextRow?.grossProfit);
    }
    if (
      this.toNumber(oldRow?.grossProfitRate) !==
      this.toNumber(nextRow?.grossProfitRate)
    ) {
      patch.grossProfitRate = this.toNumber(nextRow?.grossProfitRate);
    }
    if ((oldRow?.remark || '') !== (nextRow?.remark || '')) {
      patch.remark = nextRow?.remark || '';
    }
    if (this.toNumber(oldRow?.orderNum) !== this.toNumber(nextRow?.orderNum)) {
      patch.orderNum = this.toNumber(nextRow?.orderNum);
    }
    if (this.toNumber(oldRow?.isDeleted) !== 0) {
      patch.isDeleted = 0;
    }

    return patch;
  }

  private toIdArray(ids: number[] | number) {
    if (Array.isArray(ids)) {
      return ids.map(e => Number(e)).filter(e => !Number.isNaN(e));
    }
    const id = Number(ids);
    return Number.isNaN(id) ? [] : [id];
  }

  private normalizeLogo(value: any) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      const first = value[0];
      return this.normalizeLogo(first);
    }
    if (typeof value === 'object') {
      return (
        value.url ||
        value.fileUrl ||
        value.src ||
        value.value ||
        value.path ||
        ''
      );
    }
    return '';
  }

  private normalizeImages(value: any) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map(item => this.normalizeLogo(item))
        .filter(item => !!item);
    }
    const url = this.normalizeLogo(value);
    return url ? [url] : [];
  }
}
