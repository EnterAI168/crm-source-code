import { Provide, Body, Inject, Post, Get, Query } from '@midwayjs/core';
import {
  CoolController,
  BaseController,
  CoolEps,
  CoolUrlTag,
  CoolTag,
  TagTypes,
  RESCODE,
} from '@cool-midway/core';
import { LoginDTO } from '../../dto/login';
import { BaseSysLoginService } from '../../service/sys/login';
import { BaseSysParamService } from '../../service/sys/param';
import { Context } from '@midwayjs/koa';
import { Validate } from '@midwayjs/validate';

/**
 * 不需要登入的後台介面
 */
@Provide()
@CoolController({ description: '開放介面' })
@CoolUrlTag()
export class BaseOpenController extends BaseController {
  @Inject()
  baseSysLoginService: BaseSysLoginService;

  @Inject()
  baseSysParamService: BaseSysParamService;

  @Inject()
  ctx: Context;

  @Inject()
  eps: CoolEps;

  /**
   * 實體資訊與路徑
   * @returns
   */
  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/eps', { summary: '實體資訊與路徑' })
  public async getEps() {
    return this.ok(this.eps.admin);
  }

  /**
   * 根據配置參數key獲得網頁內容(富文本)
   */
  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/html', { summary: '獲得網頁內容的參數值' })
  async htmlByKey(@Query('key') key: string) {
    this.ctx.body = await this.baseSysParamService.htmlByKey(key);
  }

  /**
   * 登入
   * @param login
   */
  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/login', { summary: '登入' })
  @Validate()
  async login(@Body() login: LoginDTO) {
    return this.ok(await this.baseSysLoginService.login(login));
  }

  /**
   * 獲得驗證碼
   */
  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/captcha', { summary: '驗證碼' })
  async captcha(
    @Query('width') width: number,
    @Query('height') height: number,
    @Query('color') color: string
  ) {
    return this.ok(
      await this.baseSysLoginService.captcha(width, height, color)
    );
  }

  /**
   * 重新整理token
   */
  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/refreshToken', { summary: '重新整理token' })
  async refreshToken(@Query('refreshToken') refreshToken: string) {
    try {
      const token = await this.baseSysLoginService.refreshToken(refreshToken);
      return this.ok(token);
    } catch (e) {
      this.ctx.status = 401;
      this.ctx.body = {
        code: RESCODE.COMMFAIL,
        message: '登入失效~',
      };
    }
  }
}
