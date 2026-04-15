import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { CrmCustomerFollowupEntity } from '../../entity/followup';
import { CrmCustomerFollowupService } from '../../service/followup';

/**
 * 客户跟进记录
 */
@Provide()
@CoolController({
  prefix: '/admin/crmCustomerFollowup',
  api: ['add'],
  entity: CrmCustomerFollowupEntity,
  service: CrmCustomerFollowupService,
})
export class AdminCrmCustomerFollowupController extends BaseController {
  @Inject()
  crmCustomerFollowupService: CrmCustomerFollowupService;

  @Post('/page')
  async pageQuery(@Body() query: any) {
    return this.ok(await this.crmCustomerFollowupService.page(query));
  }
}
