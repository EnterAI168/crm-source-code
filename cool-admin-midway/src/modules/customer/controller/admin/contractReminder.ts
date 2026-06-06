import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { CrmContractReminderEntity } from '../../entity/contractReminder';
import { CrmContractReminderService } from '../../service/contractReminder';

@Provide()
@CoolController({
  prefix: '/admin/crmContractReminder',
  entity: CrmContractReminderEntity,
  service: CrmContractReminderService,
})
export class AdminCrmContractReminderController extends BaseController {
  @Inject()
  crmContractReminderService: CrmContractReminderService;

  @Post('/unreadCount')
  async unreadCount() {
    return this.ok(await this.crmContractReminderService.unreadCount());
  }

  @Post('/page')
  async pageQuery(@Body() body: any) {
    return this.ok(await this.crmContractReminderService.page(body));
  }

  @Post('/markRead')
  async markRead(@Body() body: any) {
    return this.ok(await this.crmContractReminderService.markRead(body));
  }
}
