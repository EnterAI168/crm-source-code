import { Config, ILogger, Middleware } from '@midwayjs/core';
import { NextFunction, Context } from '@midwayjs/koa';
import { IMiddleware, Inject } from '@midwayjs/core';
import { BaseTranslateService } from '../service/translate';
import * as _ from 'lodash';
import { RESCODE } from '@cool-midway/core';
/**
 * 翻譯中介軟體
 */
@Middleware()
export class BaseTranslateMiddleware
  implements IMiddleware<Context, NextFunction>
{
  @Inject()
  baseTranslateService: BaseTranslateService;

  @Inject()
  logger: ILogger;

  @Config('cool.i18n')
  config: {
    /** 是否開啟 */
    enable: boolean;
    /** 語言 */
    languages: string[];
    /** 翻譯服務 */
    serviceUrl?: string;
  };

  resolve() {
    return async (ctx, next: NextFunction) => {
      const url = ctx.url;
      const language = ctx.get('language');
      let data;
      try {
        data = await next();
      } catch (error) {
        this.logger.error(error);
        // 處理翻譯訊息
        if (error.name == 'CoolCommException') {
          if (error.message && error.message !== 'success') {
            ctx.status = error.statusCode || 200;
            ctx.body = {
              code: RESCODE.COMMFAIL,
              message: await this.baseTranslateService.translate(
                'msg',
                language,
                error.message
              ),
            };
            return;
          }
        }
        ctx.status = 200;
        ctx.body = {
          code: RESCODE.COMMFAIL,
          message: error.message,
        };
        return;
      }
      if (!this.config.enable) {
        return;
      }
      // 處理選單翻譯
      if (url == '/admin/base/comm/permmenu') {
        for (const menu of data.data.menus) {
          if (menu.name) {
            menu.name = await this.baseTranslateService.translate(
              'menu',
              language,
              menu.name
            );
          }
        }
      }
      if (url == '/admin/base/sys/menu/list') {
        for (const menu of data.data) {
          if (menu.name) {
            menu.name = await this.baseTranslateService.translate(
              'menu',
              language,
              menu.name
            );
          }
        }
      }
      // 處理字典翻譯
      if (url == '/admin/dict/info/list') {
        for (const dict of data.data) {
          dict.name = await this.baseTranslateService.translate(
            'dict:info',
            language,
            dict.name
          );
        }
      }
      if (url == '/admin/dict/type/page') {
        for (const dict of data.data.list) {
          dict.name = await this.baseTranslateService.translate(
            'dict:type',
            language,
            dict.name
          );
        }
      }
      if (url == '/admin/dict/info/data' || url == '/app/dict/info/data') {
        for (const key in data.data) {
          for (const item of data.data[key]) {
            item.name = await this.baseTranslateService.translate(
              'dict:info',
              language,
              item.name
            );
          }
        }
      }
    };
  }
}
