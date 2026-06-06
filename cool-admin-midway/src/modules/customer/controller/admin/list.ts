import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { CrmCustomerInfoEntity } from '../../entity/info';
import { CrmCustomerInfoService } from '../../service/info';

/**
 * 客戶管理 - 客戶列表（已分配業務員）
 */
@Provide()
@CoolController({
  prefix: '/admin/crmCustomerList',
  api: ['add', 'delete', 'update', 'info', 'list'],
  entity: CrmCustomerInfoEntity,
  service: CrmCustomerInfoService,
})
export class AdminCrmCustomerListController extends BaseController {
  @Inject()
  crmCustomerInfoService: CrmCustomerInfoService;

  @Post('/page')
  async pageQuery(@Body() query: any) {
    return this.ok(await this.crmCustomerInfoService.pageAssigned(query));
  }

  /** 業務員下拉（與公池一致，用於列表篩選） */
  @Post('/salesmenOptions')
  async salesmenOptions() {
    return this.ok(await this.crmCustomerInfoService.listSalesmenForAssign());
  }

  /** 移入公池（清空業務員） */
  @Post('/moveToPool')
  async moveToPool(@Body() body: { id: number }) {
    await this.crmCustomerInfoService.moveToPool(body.id);
    return this.ok();
  }

  /** 設為 VIP */
  @Post('/setVip')
  async setVip(@Body() body: { id: number }) {
    await this.crmCustomerInfoService.setVipCustomer(body.id);
    return this.ok();
  }

  /** 取消 VIP */
  @Post('/cancelVip')
  async cancelVip(@Body() body: { id: number }) {
    await this.crmCustomerInfoService.cancelVipCustomer(body.id);
    return this.ok();
  }

  /**
   * 客戶列表匯入（行業預設空、VIP 預設否、業務員預設當前匯入人）
   */
  @Post('/importData')
  async importData(
    @Body()
    body: {
      list: Partial<CrmCustomerInfoEntity>[];
    }
  ) {
    const n = await this.crmCustomerInfoService.importListRows(body.list || []);
    return this.ok(n);
  }
}
