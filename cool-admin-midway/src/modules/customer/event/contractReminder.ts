import { Inject } from '@midwayjs/core';
import { CoolEvent, Event } from '@cool-midway/core';
import { CrmContractReminderService } from '../service/contractReminder';

@CoolEvent()
export class CrmContractReminderEvent {
  @Inject()
  crmContractReminderService: CrmContractReminderService;

  @Event('onServerReadyOnce')
  async onServerReady() {
    await this.crmContractReminderService.ensureDailyReminderTask();
  }
}
