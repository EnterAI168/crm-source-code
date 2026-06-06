import { CoolController, BaseController } from '@cool-midway/core';
import { DemoGoodsEntity } from '../../entity/goods';
import { DemoTenantService } from '../../service/tenant';

/**
 * 多租戶
 */
@CoolController({
  serviceApis: [
    'use',
    {
      method: 'noUse',
      summary: '不使用多租戶',
    },
    {
      method: 'noTenant',
      summary: '區域性不使用多租戶',
    },
  ],
  entity: DemoGoodsEntity,
  service: DemoTenantService,
})
export class AdminDemoTenantController extends BaseController {}
