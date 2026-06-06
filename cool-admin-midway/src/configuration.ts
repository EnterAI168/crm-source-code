import * as orm from '@midwayjs/typeorm';
import {
  Configuration,
  App,
  IMidwayApplication,
  Inject,
  ILogger,
  MidwayWebRouterService,
} from '@midwayjs/core';
import * as koa from '@midwayjs/koa';
// import * as crossDomain from '@midwayjs/cross-domain';
import * as validate from '@midwayjs/validate';
import * as info from '@midwayjs/info';
import * as staticFile from '@midwayjs/static-file';
import * as cron from '@midwayjs/cron';
import * as DefaultConfig from './config/config.default';
import * as LocalConfig from './config/config.local';
import * as ProdConfig from './config/config.prod';
import * as cool from '@cool-midway/core';
import * as upload from '@midwayjs/upload';
// import * as task from '@cool-midway/task';
// import * as rpc from '@cool-midway/rpc';

@Configuration({
  imports: [
    // https://koajs.com/
    koa,
    // 是否開啟跨域(注：順序不能亂放！！！) http://www.midwayjs.org/docs/extensions/cross_domain
    // crossDomain,
    // 靜態檔案託管 https://midwayjs.org/docs/extensions/static_file
    staticFile,
    // orm https://midwayjs.org/docs/extensions/orm
    orm,
    // 參數驗證 https://midwayjs.org/docs/extensions/validate
    validate,
    // 本地任務 http://www.midwayjs.org/docs/extensions/cron
    cron,
    // 檔案上傳
    upload,
    // cool-admin 官方元件 https://cool-js.com
    cool,
    // rpc 微服務 遠端呼叫
    // rpc,
    // 任務與佇列
    // task,
    {
      component: info,
      enabledEnvironment: ['local', 'prod'],
    },
  ],
  importConfigs: [
    {
      default: DefaultConfig,
      local: LocalConfig,
      prod: ProdConfig,
    },
  ],
})
export class MainConfiguration {
  @App()
  app: IMidwayApplication;

  @Inject()
  webRouterService: MidwayWebRouterService;

  @Inject()
  logger: ILogger;

  async onReady() {}
}
