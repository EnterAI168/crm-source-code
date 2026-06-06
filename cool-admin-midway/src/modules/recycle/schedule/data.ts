import {
  Provide,
  Inject,
  CommonSchedule,
  TaskLocal,
  FORMAT,
} from '@midwayjs/core';
import { ILogger } from '@midwayjs/logger';
import { RecycleDataService } from '../service/data';

/**
 * 資料定時清除定時任務
 */
@Provide()
export class BaseRecycleSchedule implements CommonSchedule {
  @Inject()
  recycleDataService: RecycleDataService;

  @Inject()
  logger: ILogger;

  // 定時執行的具體任務
  @TaskLocal(FORMAT.CRONTAB.EVERY_DAY)
  async exec() {
    this.logger.info('清除回收站資料定時任務開始執行');
    const startTime = Date.now();
    await this.recycleDataService.clear();
    this.logger.info(
      `清除回收站資料定時任務結束，耗時:${Date.now() - startTime}ms`
    );
  }
}
