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

  /**
   * 離職業務客戶轉入公池
   */
  @Post('/transferCustomersToPool', { summary: '離職業務客戶轉入公池' })
  async transferCustomersToPool(@Body('userId') userId: number) {
    return this.ok(
      await this.baseSysUserService.transferCustomersToPool(userId)
    );
  }

  /**
   * 刪除前檢查是否仍有客戶資料
   */
  @Post('/deleteCheck', { summary: '刪除前檢查使用者是否仍有客戶' })
  async deleteCheck(@Body('ids') ids: number[] | number) {
    return this.ok(await this.baseSysUserService.deleteCheck(ids));
  }
}
