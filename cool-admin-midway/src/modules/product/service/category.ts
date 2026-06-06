import { InjectEntityModel } from '@midwayjs/typeorm';
import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { ProductCategoryEntity } from '../entity/category';
import { In, Repository } from 'typeorm';

/**
 * 產品分類
 */
@Provide()
export class ProductCategoryService extends BaseService {
  @InjectEntityModel(ProductCategoryEntity)
  productCategoryEntity: Repository<ProductCategoryEntity>;

  async page(query) {
    const { name, keyWord, status } = query || {};
    const categoryName = name || keyWord;
    const sql = `
      SELECT a.*
      FROM product_category a
      WHERE a.isDeleted = 0
      ${this.setSql(categoryName, 'and a.name like ?', [`%${categoryName}%`])}
      ${this.setSql(status, 'and a.status = ?', [status])}
    `;
    return this.sqlRenderPage(sql, query);
  }

  async list(query) {
    return this.productCategoryEntity.find({
      where: {
        isDeleted: 0,
        ...(query?.status !== undefined ? { status: Number(query.status) } : {}),
      },
      order: { orderNum: 'ASC', id: 'ASC' },
    });
  }

  async info(id: number | string) {
    return this.productCategoryEntity.findOneBy({
      id: Number(id),
      isDeleted: 0,
    });
  }

  async add(param) {
    param.isDeleted = 0;
    await this.productCategoryEntity.save(param);
    return param.id;
  }

  async update(param) {
    await this.productCategoryEntity.save({
      ...param,
      isDeleted: 0,
    });
  }

  async delete(ids: number[] | number) {
    const idArr = Array.isArray(ids)
      ? ids.map(e => Number(e)).filter(e => !Number.isNaN(e))
      : [Number(ids)].filter(e => !Number.isNaN(e));

    if (idArr.length === 0) {
      return;
    }

    await this.productCategoryEntity.update(
      { id: In(idArr) },
      { isDeleted: 1 }
    );
  }
}
