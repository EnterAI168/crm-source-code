import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { BaseSysUserEntity } from '../../../entity/sys/user';
import { BaseSysUserService } from '../../../service/sys/user';

/**
 * 系統使用者
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: BaseSysUserEntity,
  service: BaseSysUserService,
  insertParam: ctx => {
    return {
      userId: ctx.admin.userId,
    };
  },
})
export class BaseSysUserController extends BaseController {
  @Inject()
  baseSysUserService: BaseSysUserService;

  /**
   * 移動部門
   */
  @Post('/move', { summary: '移動部門' })
  async move(
    @Body('departmentId') departmentId: number,
    @Body('userIds') userIds: []
  ) {
    await this.baseSysUserService.move(departmentId, userIds);
    return this.ok();
  }
}
