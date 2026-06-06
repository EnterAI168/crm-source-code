import { Body, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TaskInfoEntity } from '../../entity/info';
import { TaskInfoService } from '../../service/info';

/**
 * 任務
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'page'],
  entity: TaskInfoEntity,
  service: TaskInfoService,
  before: ctx => {
    ctx.request.body.limit = ctx.request.body.repeatCount;
  },
  pageQueryOp: {
    fieldEq: ['status', 'type'],
  },
})
export class TaskInfoController extends BaseController {
  @Inject()
  taskInfoService: TaskInfoService;

  /**
   * 手動執行一次
   */
  @Post('/once', { summary: '執行一次' })
  async once(@Body('id') id: number) {
    await this.taskInfoService.once(id);
    this.ok();
  }

  /**
   * 暫停任務
   */
  @Post('/stop', { summary: '停止' })
  async stop(@Body('id') id: number) {
    await this.taskInfoService.stop(id);
    this.ok();
  }

  /**
   * 開始任務
   */
  @Post('/start', { summary: '開始' })
  async start(@Body('id') id: number, @Body('type') type: number) {
    await this.taskInfoService.start(id, type);
    this.ok();
  }

  /**
   * 日誌
   */
  @Get('/log', { summary: '日誌' })
  async log(@Query() params: any) {
    return this.ok(await this.taskInfoService.log(params));
  }
}
