import { Config, Controller, Get, Inject } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { SwaggerBuilder } from '../builder';
import { BaseController } from '@cool-midway/core';

/**
 * 歡迎介面
 */
@Controller('/swagger')
export class SwaggerIndexController extends BaseController {
  @Inject()
  ctx: Context;

  @Inject()
  swaggerBuilder: SwaggerBuilder;

  @Config('cool.eps')
  epsConfig: boolean;

  @Get('/', { summary: 'swagger介面' })
  public async index() {
    if (!this.epsConfig) {
      return this.fail('Eps未開啟');
    }
    await this.ctx.render('swagger', {});
  }

  @Get('/json', { summary: '獲得Swagger JSON資料' })
  public async json() {
    if (!this.epsConfig) {
      return this.fail('Eps未開啟');
    }
    return this.swaggerBuilder.json;
  }
}
