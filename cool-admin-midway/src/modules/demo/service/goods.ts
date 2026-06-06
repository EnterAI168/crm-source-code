import { DemoGoodsEntity } from './../entity/goods';
import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';

/**
 * 商品示例
 */
@Provide()
export class DemoGoodsService extends BaseService {
  @InjectEntityModel(DemoGoodsEntity)
  demoGoodsEntity: Repository<DemoGoodsEntity>;

  @Inject()
  ctx;

  /**
   * 執行sql分頁
   */
  async sqlPage(query) {
    await this.demoGoodsEntity.save({
      id: 1,
      title: '標題',
      price: 99.0,
      description: '商品描述',
      mainImage: 'https://cool-js.com/logo.png',
    });
    return this.sqlRenderPage(
      'select * from demo_goods ORDER BY id ASC',
      query,
      false
    );
  }

  /**
   * 執行entity分頁
   */
  async entityPage(query) {
    const find = this.demoGoodsEntity.createQueryBuilder();
    return this.entityRenderPage(find, query);
  }
}
