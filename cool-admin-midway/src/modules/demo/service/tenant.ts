import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { DemoGoodsEntity } from '../entity/goods';
import { noTenant } from '../../base/db/tenant';

/**
 * 商品服務
 */
@Provide()
export class DemoTenantService extends BaseService {
  @InjectEntityModel(DemoGoodsEntity)
  demoGoodsEntity: Repository<DemoGoodsEntity>;

  @Inject()
  ctx;

  /**
   * 使用多租戶
   */
  async use() {
    await this.demoGoodsEntity.createQueryBuilder().getMany();
    await this.demoGoodsEntity.find();
  }

  /**
   * 不使用多租戶(區域性不使用)
   */
  async noUse() {
    // 過濾多租戶
    await this.demoGoodsEntity.createQueryBuilder().getMany();
    // 被noTenant包裹，不會過濾多租戶
    await noTenant(this.ctx, async () => {
      return await this.demoGoodsEntity.createQueryBuilder().getMany();
    });
    // 過濾多租戶
    await this.demoGoodsEntity.find();
  }

  /**
   * 無效多租戶
   */
  async invalid() {
    // 自定義sql，不進行多租戶過濾
    await this.nativeQuery('select * from demo_goods');
    // 自定義分頁sql，不進行多租戶過濾
    await this.sqlRenderPage('select * from demo_goods');
  }
}
