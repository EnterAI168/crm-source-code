import { Job, IJob } from '@midwayjs/cron';
import { FORMAT, ILogger, Inject } from '@midwayjs/core';
import { BaseSysLogService } from '../service/sys/log';

/**
 * 日誌定時任務
 */
@Job({
  cronTime: FORMAT.CRONTAB.EVERY_DAY,
  start: true,
})
export class BaseLogJob implements IJob {
  @Inject()
  baseSysLogService: BaseSysLogService;

  @Inject()
  logger: ILogger;

  async onTick() {
    this.logger.info('清除日誌定時任務開始執行');
    const startTime = Date.now();
    await this.baseSysLogService.clear();
    this.logger.info(`清除日誌定時任務結束，耗時:${Date.now() - startTime}ms`);
  }
}
