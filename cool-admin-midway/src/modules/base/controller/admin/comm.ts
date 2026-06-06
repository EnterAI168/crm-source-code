import {
  BaseController,
  CoolController,
  CoolTag,
  CoolUrlTag,
  TagTypes,
} from '@cool-midway/core';
import { ALL, Body, Get, Inject, Post, Provide } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { PluginService } from '../../../plugin/service/info';
import { BaseSysUserEntity } from '../../entity/sys/user';
import { BaseSysLoginService } from '../../service/sys/login';
import { BaseSysPermsService } from '../../service/sys/perms';
import { BaseSysUserService } from '../../service/sys/user';

/**
 * Base 通用介面 一般寫不需要權限過濾的介面
 */
@CoolUrlTag()
@Provide()
@CoolController()
export class BaseCommController extends BaseController {
  @Inject()
  baseSysUserService: BaseSysUserService;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  @Inject()
  baseSysLoginService: BaseSysLoginService;

  @Inject()
  ctx: Context;

  @Inject()
  pluginService: PluginService;

  /**
   * 獲得個人資訊
   */
  @Get('/person', { summary: '個人資訊' })
  async person() {
    return this.ok(
      await this.baseSysUserService.person(this.ctx.admin?.userId)
    );
  }

  /**
   * 修改個人資訊
   */
  @Post('/personUpdate', { summary: '修改個人資訊' })
  async personUpdate(@Body(ALL) user: BaseSysUserEntity) {
    await this.baseSysUserService.personUpdate(user);
    return this.ok();
  }

  /**
   * 權限選單
   */
  @Get('/permmenu', { summary: '權限與選單' })
  async permmenu() {
    return this.ok(
      await this.baseSysPermsService.permmenu(this.ctx.admin.roleIds)
    );
  }

  /**
   * 檔案上傳
   */
  @Post('/upload', { summary: '檔案上傳' })
  async upload() {
    const file = await this.pluginService.getInstance('upload');
    return this.ok(await file.upload(this.ctx));
  }

  /**
   * 檔案上傳模式，本地或者雲端儲存
   */
  @Get('/uploadMode', { summary: '檔案上傳模式' })
  async uploadMode() {
    const file = await this.pluginService.getInstance('upload');
    return this.ok(await file.getMode());
  }

  /**
   * 退出
   */
  @Post('/logout', { summary: '退出' })
  async logout() {
    await this.baseSysLoginService.logout();
    return this.ok();
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/program', { summary: '程式設計' })
  async program() {
    return this.ok('Node');
  }
}
