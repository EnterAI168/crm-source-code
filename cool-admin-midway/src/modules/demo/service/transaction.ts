import { DemoGoodsEntity } from './../entity/goods';
import { Provide } from '@midwayjs/core';
import { BaseService, CoolTransaction } from '@cool-midway/core';
import { QueryRunner } from 'typeorm';

/**
 * 操作事務
 */
@Provide()
export class DemoTransactionService extends BaseService {
  /**
   * 事務操作
   */
  @CoolTransaction({
    connectionName: 'default',
  })
  async add(param, queryRunner?: QueryRunner) {
    await queryRunner.manager.insert<DemoGoodsEntity>(DemoGoodsEntity, param);
    return {
      id: param.id,
    };
  }
}
