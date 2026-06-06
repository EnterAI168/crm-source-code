import { App, Provide } from '@midwayjs/core';
import { DemoGoodsEntity } from '../entity/goods';
import { IMidwayApplication, Inject } from '@midwayjs/core';
import {
  BaseRpcService,
  CoolRpc,
  CoolRpcService,
  CoolRpcTransaction,
} from '@cool-midway/rpc';
import { QueryRunner } from 'typeorm';

@Provide()
@CoolRpcService({
  entity: DemoGoodsEntity,
  method: ['info', 'add', 'page'],
})
export class DemoRpcService extends BaseRpcService {
  @App()
  app: IMidwayApplication;

  @Inject()
  rpc: CoolRpc;

  /**
   * 遠端呼叫
   * @returns
   */
  async call() {
    return await this.rpc.call('goods', 'demoGoodsService', 'test', {
      a: 1,
    });
  }

  /**
   * 叢集事件
   */
  async event() {
    this.rpc.event('test', { a: 1 });
  }

  async info(params) {
    return params;
  }
  async getUser() {
    return {
      uid: '123',
      username: 'mockedName',
      phone: '12345678901',
      email: 'xxx.xxx@xxx.com',
    };
  }

  @CoolRpcTransaction()
  async transaction(params, rpcTransactionId?, queryRunner?: QueryRunner) {
    console.log('獲得的參數', params);
    const data = {
      title: '商品標題',
      pic: 'https://xxx',
      price: 99.0,
      type: 1,
    };
    await queryRunner.manager.save(DemoGoodsEntity, data);

    // 將事務id傳給呼叫的遠端服務方法
    await this.rpc.call('goods', 'demoGoodsService', 'transaction', {
      rpcTransactionId,
      ...params,
    });
  }
}
