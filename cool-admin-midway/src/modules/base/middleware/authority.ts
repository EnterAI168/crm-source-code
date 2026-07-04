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
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseSysUserEntity } from '../entity/sys/user';

/**
 * 權限校驗
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

  @InjectEntityModel(BaseSysUserEntity)
  baseSysUserEntity: Repository<BaseSysUserEntity>;

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
      // 路由地址為 admin字首的 需要權限校驗
      if (_.startsWith(url, adminUrl)) {
        try {
          ctx.admin = jwt.verify(token, this.jwtConfig.jwt.secret);
          if (ctx.admin.isRefresh) {
            ctx.status = 401;
            throw new CoolCommException('登入失效~', ctx.status);
          }
        } catch (error) {}
        // 使用matchUrl方法來檢查URL是否應該被忽略
        const isIgnored = this.ignoreUrls.some(pattern =>
          this.utils.matchUrl(pattern, url)
        );
        if (isIgnored) {
          await next();
          return;
        }
        if (ctx.admin) {
          const currentUser = await this.baseSysUserEntity.findOneBy({
            id: ctx.admin.userId,
          });
          if (!currentUser || Number(currentUser.status) === 0) {
            throw new CoolCommException('登入失效~', 401);
          }
          const rToken = await this.midwayCache.get(
            `admin:token:${ctx.admin.userId}`
          );
          // 判斷密碼版本是否正確
          const passwordV = await this.midwayCache.get(
            `admin:passwordVersion:${ctx.admin.userId}`
          );
          if (passwordV != ctx.admin.passwordVersion) {
            throw new CoolCommException('登入失效~', 401);
          }
          // 超管擁有所有權限
          if (ctx.admin.username == 'admin' && !ctx.admin.isRefresh) {
            if (rToken !== token && this.jwtConfig.jwt.sso) {
              throw new CoolCommException('登入失效~', 401);
            } else {
              await next();
              return;
            }
          }
          // 要登入每個人都有權限的介面
          if (
            new RegExp(`^${adminUrl}?.*/comm/`).test(url) ||
            // 字典介面
            url == '/admin/dict/info/data'
          ) {
            await next();
            return;
          }
          // 如果傳的token是refreshToken則校驗失敗
          if (ctx.admin.isRefresh) {
            throw new CoolCommException('登入失效~', 401);
          }
          if (!rToken) {
            throw new CoolCommException('登入失效或無權限訪問~', 401);
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
                // 使用者管理-使用者列表改為讀取系統使用者介面時，相容原有 user:info:page 權限
                'base/sys/user/page': ['user/info/page'],
                'base/sys/user/transferCustomersToPool': [
                  'base/sys/user/update',
                  'base/sys/user/page',
                ],
                'base/sys/user/deleteCheck': [
                  'base/sys/user/delete',
                  'base/sys/user/page',
                ],
                /**
                 * CRM 客戶：控制器 prefix 為 crmCustomerList / crmCustomerPool 等，
                 * 與選單權限 crm:customerList:*（轉後為 crm/customerList/*）路徑不一致，需對映
                 */
                'crmCustomerList/page': ['crm/customerList/page'],
                'crmCustomerList/add': ['crm/customerList/add'],
                'crmCustomerList/delete': ['crm/customerList/delete'],
                'crmCustomerList/update': [
                  'crm/customerList/update',
                  'crm/customerList/add',
                ],
                /** 編輯/檢視詳情必調 info；選單常未單獨配 info，與列表/新增/編輯互通 */
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
                ],
                /** 列表業務員下拉：與公池分配業務員同一能力 */
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
                /** 公池編輯先調 info；角色常有新增/分頁無詳情、無單獨編輯時與列表一致 */
                'crmCustomerPool/info': [
                  'crm/customerPool/info',
                  'crm/customerPool/page',
                  'crm/customerPool/add',
                  'crm/customerPool/update',
                ],
                'crmCustomerPool/list': ['crm/customerPool/list'],
                'crmCustomerPool/importData': ['crm/customerPool/import'],
                'crmCustomerPool/assignSalesman': [
                  'crm/customerPool/assignSalesman',
                ],
                'crmCustomerPool/salesmenOptions': [
                  'crm/customerPool/assignSalesman',
                ],
                'crmCustomerPool/sendMail': ['crm/customerPool/sendMail'],
                'crmCustomerFollowup/page': [
                  'crm/customerList/follow',
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/history',
                  'crm/quoteOrder/departmentCost',
                  'crm/customerList/quotationView',
                ],
                'crmCustomerFollowup/add': ['crm/customerList/follow'],
                'crmQuoteOrder/page': [
                  'crm/quoteOrder/page',
                  'crm/customerList/quotationView',
                ],
                'crmQuoteOrder/add': ['crm/quoteOrder/add'],
                'crmQuoteOrder/update': [
                  'crm/quoteOrder/update',
                  'crm/quoteOrder/add',
                ],
                'crmQuoteOrder/applyAllowance': [
                  'crm/quoteOrder/applyAllowance',
                ],
                'crmQuoteOrder/delete': ['crm/quoteOrder/delete'],
                'crmQuoteOrder/info': [
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/page',
                  'crm/quoteOrder/add',
                  'crm/quoteOrder/update',
                  'crm/quoteOrder/applyAllowance',
                  'crm/quoteOrder/departmentCost',
                  'crm/customerList/quotationView',
                  'crm/quoteInvoice/quoteInfo',
                ],
                'crmQuoteOrder/customerOptions': [
                  'crm/quoteOrder/page',
                  'crm/quoteOrder/add',
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/update',
                  'crm/quoteOrder/applyAllowance',
                  'crm/quoteOrder/departmentCost',
                  'crm/customerList/quotationView',
                  'crm/quoteInvoice/page',
                  'crm/quoteInvoice/quoteInfo',
                ],
                'crmQuoteOrder/productOptions': [
                  'crm/quoteOrder/page',
                  'crm/quoteOrder/add',
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/update',
                  'crm/quoteOrder/applyAllowance',
                  'crm/quoteOrder/departmentCost',
                  'crm/customerList/quotationView',
                  'crm/quoteInvoice/quoteInfo',
                ],
                'crmQuoteOrder/salesmanOptions': [
                  'crm/quoteOrder/page',
                  'crm/quoteOrder/add',
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/update',
                  'crm/quoteOrder/applyAllowance',
                  'crm/customerList/quotationView',
                  'crm/quoteInvoice/page',
                ],
                'crmQuoteOrder/duty': [
                  'crm/quoteOrder/page',
                  'crm/quoteOrder/add',
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/update',
                  'crm/quoteOrder/applyAllowance',
                  'crm/quoteOrder/departmentCost',
                  'crm/customerList/quotationView',
                  'crm/quoteInvoice/quoteInfo',
                ],
                'crmQuoteOrder/quoteTerms': [
                  'crm/quoteOrder/page',
                  'crm/quoteOrder/add',
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/update',
                  'crm/quoteOrder/applyAllowance',
                  'crm/quoteOrder/departmentCost',
                  'crm/customerList/quotationView',
                  'crm/quoteInvoice/quoteInfo',
                ],
                'crmQuoteOrder/quoteDiscountRate': [
                  'crm/quoteOrder/page',
                  'crm/quoteOrder/add',
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/update',
                  'crm/quoteOrder/applyAllowance',
                  'crm/quoteOrder/departmentCost',
                  'crm/customerList/quotationView',
                  'crm/quoteInvoice/quoteInfo',
                ],
                'crmQuoteOrder/assigneeOptions': [
                  'crm/quoteOrder/assign',
                  'crm/quoteOrder/page',
                ],
                'crmQuoteOrder/submitAudit': [
                  'crm/quoteOrder/submitAudit',
                  'crm/quoteOrder/add',
                  'crm/quoteOrder/update',
                ],
                'crmQuoteOrder/audit': ['crm/quoteOrder/audit'],
                'crmQuoteOrder/assign': ['crm/quoteOrder/assign'],
                'crmQuoteOrder/departmentAudits': [
                  'crm/quoteOrder/page',
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/departmentCost',
                  'crm/customerList/quotationView',
                  'crm/quoteOrder/audit',
                  'crm/quoteOrder/assign',
                ],
                'crmQuoteOrder/auditDepartment': ['crm/quoteOrder/audit'],
                'crmQuoteOrder/assignDepartment': ['crm/quoteOrder/assign'],
                'crmQuoteOrder/departmentAssigneeOptions': [
                  'crm/quoteOrder/assign',
                ],
                'crmQuoteOrder/submitDepartmentCosts': [
                  'crm/quoteOrder/departmentCost',
                  'crm/quoteOrder/page',
                ],
                'crmQuoteOrder/sendQuote': ['crm/quoteOrder/sendQuote'],
                'crmQuoteOrder/uploadContract': [
                  'crm/quoteOrder/uploadContract',
                ],
                'crmQuoteOrder/caseMeetingScope': ['crm/quoteOrder/page'],
                'crmQuoteOrder/updateCaseMeeting': ['crm/quoteOrder/page'],
                'crmQuoteOrder/downloadContract': [
                  'crm/quoteOrder/uploadContract',
                  'crm/quoteOrder/info',
                  'crm/customerList/quotationView',
                ],
                'crmQuoteOrder/receiptStages': ['crm/quoteOrder/receipt'],
                'crmQuoteOrder/submitReceipt': ['crm/quoteOrder/receipt'],
                'crmQuoteOrder/invoiceStages': ['crm/quoteOrder/invoice'],
                'crmQuoteOrder/applyInvoice': ['crm/quoteOrder/invoice'],
                'crmQuoteOrder/voidInvoice': ['crm/quoteOrder/invoice'],
                'crmQuoteOrder/copyCreate': ['crm/quoteOrder/copyCreate'],
                'crmQuoteOrder/quoteHistories': [
                  'crm/quoteOrder/history',
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/departmentCost',
                  'crm/customerList/quotationView',
                ],
                'crmQuoteOrder/quoteHistoryDetail': [
                  'crm/quoteOrder/history',
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/departmentCost',
                  'crm/customerList/quotationView',
                ],
                'crmQuoteOrder/quoteHistoryPdf': [
                  'crm/quoteOrder/history',
                  'crm/quoteOrder/info',
                  'crm/quoteOrder/departmentCost',
                  'crm/customerList/quotationView',
                ],
                'crmQuoteOrder/nextNo': ['crm/quoteOrder/add'],
                /**
                 * 供應商管理：控制器 prefix 為 crmSupplier，
                 * 選單權限為 crm:supplier:*，需要做路由別名對映
                 */
                'crmSupplier/page': ['crm/supplier/page'],
                'crmSupplier/add': ['crm/supplier/add'],
                'crmSupplier/delete': ['crm/supplier/delete'],
                'crmSupplier/update': [
                  'crm/supplier/update',
                  'crm/supplier/add',
                ],
                'crmSupplier/info': [
                  'crm/supplier/info',
                  'crm/supplier/page',
                  'crm/supplier/add',
                  'crm/supplier/update',
                ],
                'crmSupplier/list': ['crm/supplier/list'],
                /**
                 * 匯款單：控制器 prefix 為 crmRemittance，
                 * 選單權限為 crm:remittance:*，需要做路由別名對映
                 */
                'crmRemittance/page': ['crm/remittance/page'],
                'crmRemittance/add': ['crm/remittance/add'],
                'crmRemittance/delete': ['crm/remittance/delete'],
                'crmRemittance/update': [
                  'crm/remittance/update',
                  'crm/remittance/add',
                ],
                'crmRemittance/info': [
                  'crm/remittance/info',
                  'crm/remittance/page',
                  'crm/remittance/add',
                  'crm/remittance/update',
                ],
                'crmRemittance/list': ['crm/remittance/list'],
                'crmRemittance/remittanceStages': [
                  'crm/remittance/info',
                  'crm/remittance/page',
                  'crm/remittance/remit',
                ],
                'crmRemittance/submitRemittance': ['crm/remittance/remit'],
                'crmRemittance/updateReceivedStatus': [
                  'crm/remittance/update',
                  'crm/remittance/remit',
                ],
                'crmRemittance/quoteOrderOptions': [
                  'crm/remittance/page',
                  'crm/remittance/add',
                  'crm/remittance/update',
                ],
                'crmRemittance/supplierOptions': [
                  'crm/remittance/page',
                  'crm/remittance/add',
                  'crm/remittance/update',
                ],
                'crmRemittance/nextNo': ['crm/remittance/add'],
                'crmQuoteInvoice/page': ['crm/quoteInvoice/page'],
                'crmQuoteInvoice/info': [
                  'crm/quoteInvoice/info',
                  'crm/quoteInvoice/audit',
                  'crm/quoteInvoice/preview',
                  'crm/quoteInvoice/send',
                ],
                'crmQuoteInvoice/audit': ['crm/quoteInvoice/audit'],
                'crmQuoteInvoice/preview': ['crm/quoteInvoice/preview'],
                'crmQuoteInvoice/downloadPdf': [
                  'crm/quoteInvoice/preview',
                  'crm/quoteOrder/invoice',
                ],
                'crmQuoteInvoice/send': ['crm/quoteInvoice/send'],
                'crmQuoteInvoice/handleScheduled': ['crm/quoteInvoice/audit'],
                /**
                 * 專案管理列表：控制器 prefix 為 productProject，
                 * 選單權限為 product:project:*，需要做路由別名對映
                 */
                'productProject/page': ['product/project/page'],
                'productProject/info': [
                  'product/project/info',
                  'product/project/page',
                  'product/project/update',
                ],
                'productProject/update': ['product/project/update'],
                'crmPerformance/page': ['crm/performance/page'],
                'crmPerformance/expectedDetail': [
                  'crm/performance/expectedDetail',
                  'crm/performance/page',
                ],
                'crmPerformance/actualDetail': [
                  'crm/performance/actualDetail',
                  'crm/performance/page',
                ],
                'crmPerformance/internalDetail': [
                  'crm/performance/detail',
                  'crm/performance/page',
                ],
                'crmPerformance/syncMonth': ['crm/performance/page'],
                'crmPerformance/platformStatistics': [
                  'crm/platformStatistics/page',
                ],
                'crmPerformance/invoiceStatistics': [
                  'crm/invoiceStatistics/page',
                ],
                'crmPerformance/internalStatistics': [
                  'crm/internalStatistics/page',
                ],
                'crmPerformance/bonusAccountingPage': [
                  'crm/bonusAccounting/page',
                ],
                'crmPerformance/bonusAccountingDetail': [
                  'crm/bonusAccounting/detail',
                  'crm/bonusAccounting/page',
                ],
                'crmPerformance/annualAssessmentPage': [
                  'crm/annualAssessment/page',
                ],
                'crmPerformance/annualAssessmentDetail': [
                  'crm/annualAssessment/detail',
                  'crm/annualAssessment/page',
                ],
                'crmBonusConfig/page': ['crm/bonusConfig/page'],
                'crmBonusConfig/list': [
                  'crm/bonusConfig/page',
                  'crm/bonusConfig/list',
                ],
                'crmBonusConfig/add': ['crm/bonusConfig/add'],
                'crmBonusConfig/update': [
                  'crm/bonusConfig/update',
                  'crm/bonusConfig/add',
                ],
                'crmBonusConfig/delete': ['crm/bonusConfig/delete'],
                'crmBonusConfig/initDefault': [
                  'crm/bonusConfig/add',
                  'crm/bonusConfig/update',
                ],
                'crmContractReminder/unreadCount': [
                  'crm/quoteOrder/page',
                  'crm/customerList/page',
                  'crm/performance/page',
                ],
                'crmContractReminder/page': [
                  'crm/quoteOrder/page',
                  'crm/customerList/page',
                  'crm/performance/page',
                ],
                'crmContractReminder/markRead': [
                  'crm/quoteOrder/page',
                  'crm/customerList/page',
                  'crm/performance/page',
                ],
              };
              const allowPerms = [
                requestPerm,
                ...(aliasPerms[requestPerm] || []),
              ];
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
          throw new CoolCommException('登入失效或無權限訪問~', statusCode);
        }
      }
      await next();
    };
  }
}
