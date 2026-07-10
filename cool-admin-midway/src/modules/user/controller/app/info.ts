import { CoolController, BaseController } from '@cool-midway/core';
import { Body, Get, Inject, Post } from '@midwayjs/core';
import { UserInfoService } from '../../service/info';
import { UserInfoEntity } from '../../entity/info';

/**
 * 使用者資訊
 */
@CoolController({
  api: [],
  entity: UserInfoEntity,
})
export class AppUserInfoController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  userInfoService: UserInfoService;

  @Get('/person', { summary: '取得使用者資訊' })
  async person() {
    return this.ok(await this.userInfoService.person(this.ctx.user.id));
  }

  @Post('/updatePerson', { summary: '更新使用者資訊' })
  async updatePerson(@Body() body) {
    return this.ok(
      await this.userInfoService.updatePerson(this.ctx.user.id, body)
    );
  }

  @Post('/updatePassword', { summary: '更新使用者密碼' })
  async updatePassword(
    @Body('password') password: string,
    @Body('code') code: string
  ) {
    await this.userInfoService.updatePassword(this.ctx.user.id, password, code);
    return this.ok();
  }

  @Post('/logoff', { summary: '登出' })
  async logoff() {
    await this.userInfoService.logoff(this.ctx.user.id);
    return this.ok();
  }

  @Post('/bindPhone', { summary: '繫結手機號碼' })
  async bindPhone(@Body('phone') phone: string, @Body('code') code: string) {
    await this.userInfoService.bindPhone(this.ctx.user.id, phone, code);
    return this.ok();
  }

  @Post('/miniPhone', { summary: '繫結小程式手機號碼' })
  async miniPhone(@Body() body) {
    const { code, encryptedData, iv } = body;
    return this.ok(
      await this.userInfoService.miniPhone(
        this.ctx.user.id,
        code,
        encryptedData,
        iv
      )
    );
  }
}
