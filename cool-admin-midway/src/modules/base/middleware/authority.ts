import { App, Config, Inject, Middleware } from '@midwayjs/core';
import * as _ from 'lodash';
import { CoolCommException, CoolUrlTagData, TagTypes } from '@cool-midway/core';
import * as jwt from 'jsonwebtoken';
import { NextFunction, Context } from '@midwayjs/koa';
import {
  IMiddleware,
  IMidwayApplication,
  Init,
  InjectClient,
} from '@midwayjs/core';
import { CachingFactory, MidwayCache } from '@midwayjs/cache-manager';
import { Utils } from '../../../comm/utils';

/**
 * 权限校验
 */
@Middleware()
export class BaseAuthorityMiddleware
  implements IMiddleware<Context, NextFunction>
{
  @Config('koa.globalPrefix')
  prefix;

  @Config('module.base')
  jwtConfig;

  @InjectClient(CachingFactory, 'default')
  midwayCache: MidwayCache;

  @Inject()
  coolUrlTagData: CoolUrlTagData;

  @App()
  app: IMidwayApplication;

  @Inject()
  utils: Utils;

  ignoreUrls: string[] = [];

  @Init()
  async init() {
    this.ignoreUrls = this.coolUrlTagData.byKey(TagTypes.IGNORE_TOKEN, 'admin');
  }

  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      let statusCode = 200;
      let { url } = ctx;
      url = url.replace(this.prefix, '').split('?')[0];
      const token = ctx.get('Authorization');
      const adminUrl = '/admin/';
      // 路由地址为 admin前缀的 需要权限校验
      if (_.startsWith(url, adminUrl)) {
        try {
          ctx.admin = jwt.verify(token, this.jwtConfig.jwt.secret);
          if (ctx.admin.isRefresh) {
            ctx.status = 401;
            throw new CoolCommException('登录失效~', ctx.status);
          }
        } catch (error) {}
        // 使用matchUrl方法来检查URL是否应该被忽略
        const isIgnored = this.ignoreUrls.some(pattern =>
          this.utils.matchUrl(pattern, url)
        );
        if (isIgnored) {
          await next();
          return;
        }
        if (ctx.admin) {
          const rToken = await this.midwayCache.get(
            `admin:token:${ctx.admin.userId}`
          );
          // 判断密码版本是否正确
          const passwordV = await this.midwayCache.get(
            `admin:passwordVersion:${ctx.admin.userId}`
          );
          if (passwordV != ctx.admin.passwordVersion) {
            throw new CoolCommException('登录失效~', 401);
          }
          // 超管拥有所有权限
          if (ctx.admin.username == 'admin' && !ctx.admin.isRefresh) {
            if (rToken !== token && this.jwtConfig.jwt.sso) {
              throw new CoolCommException('登录失效~', 401);
            } else {
              await next();
              return;
            }
          }
          // 要登录每个人都有权限的接口
          if (
            new RegExp(`^${adminUrl}?.*/comm/`).test(url) ||
            // 字典接口
            url == '/admin/dict/info/data'
          ) {
            await next();
            return;
          }
          // 如果传的token是refreshToken则校验失败
          if (ctx.admin.isRefresh) {
            throw new CoolCommException('登录失效~', 401);
          }
          if (!rToken) {
            throw new CoolCommException('登录失效或无权限访问~', 401);
          }
          if (rToken !== token && this.jwtConfig.jwt.sso) {
            statusCode = 401;
          } else {
            let perms: string[] = await this.midwayCache.get(
              `admin:perms:${ctx.admin.userId}`
            );
            if (!_.isEmpty(perms)) {
              perms = perms.map(e => {
                return e.replace(/:/g, '/');
              });
              const requestPerm = url.split('?')[0].replace('/admin/', '');
              const aliasPerms: Record<string, string[]> = {
                // 用户管理-用户列表改为读取系统用户接口时，兼容原有 user:info:page 权限
                'base/sys/user/page': ['user/info/page'],
                /**
                 * CRM 客户：控制器 prefix 为 crmCustomerList / crmCustomerPool 等，
                 * 与菜单权限 crm:customerList:*（转后为 crm/customerList/*）路径不一致，需映射
                 */
                'crmCustomerList/page': ['crm/customerList/page'],
                'crmCustomerList/add': ['crm/customerList/add'],
                'crmCustomerList/delete': ['crm/customerList/delete'],
                'crmCustomerList/update': [
                  'crm/customerList/update',
                  'crm/customerList/add',
                ],
                /** 编辑/查看详情必调 info；菜单常未单独配 info，与列表/新增/编辑互通 */
                'crmCustomerList/info': [
                  'crm/customerList/info',
                  'crm/customerList/page',
                  'crm/customerList/add',
                  'crm/customerList/update',
                ],
                'crmCustomerList/list': ['crm/customerList/list'],
                'crmCustomerList/moveToPool': ['crm/customerList/moveToPool'],
                'crmCustomerList/setVip': ['crm/customerList/setVip'],
                'crmCustomerList/cancelVip': ['crm/customerList/cancelVip'],
                'crmCustomerList/importData': [
                  'crm/customerList/import',
                  'crm/customerList/add',
                ],
                /** 列表业务员下拉：与公池分配业务员同一能力 */
                'crmCustomerList/salesmenOptions': [
                  'crm/customerPool/assignSalesman',
                ],
                'crmCustomerPool/page': ['crm/customerPool/page'],
                'crmCustomerPool/add': ['crm/customerPool/add'],
                'crmCustomerPool/delete': ['crm/customerPool/delete'],
                'crmCustomerPool/update': [
                  'crm/customerPool/update',
                  'crm/customerPool/add',
                ],
                /** 公池编辑先调 info；角色常有新增/分页无详情、无单独编辑时与列表一致 */
                'crmCustomerPool/info': [
                  'crm/customerPool/info',
                  'crm/customerPool/page',
                  'crm/customerPool/add',
                  'crm/customerPool/update',
                ],
                'crmCustomerPool/list': ['crm/customerPool/list'],
                'crmCustomerPool/importData': ['crm/customerPool/import'],
                'crmCustomerPool/assignSalesman': ['crm/customerPool/assignSalesman'],
                'crmCustomerPool/salesmenOptions': ['crm/customerPool/assignSalesman'],
                'crmCustomerFollowup/page': ['crm/customerList/follow'],
                'crmCustomerFollowup/add': ['crm/customerList/follow'],
              };
              const allowPerms = [requestPerm, ...(aliasPerms[requestPerm] || [])];
              if (!allowPerms.some(item => perms.includes(item))) {
                statusCode = 403;
              }
            } else {
              statusCode = 403;
            }
          }
        } else {
          statusCode = 401;
        }
        if (statusCode > 200) {
          throw new CoolCommException('登录失效或无权限访问~', statusCode);
        }
      }
      await next();
    };
  }
}
