import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { CrmCustomerInfoEntity } from '../../entity/info';
import { CrmCustomerInfoService } from '../../service/info';

/**
 * 客户管理 - 客户列表（已分配业务员）
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

  /** 业务员下拉（与公池一致，用于列表筛选） */
  @Post('/salesmenOptions')
  async salesmenOptions() {
    return this.ok(await this.crmCustomerInfoService.listSalesmenForAssign());
  }

  /** 移入公池（清空业务员） */
  @Post('/moveToPool')
  async moveToPool(@Body() body: { id: number }) {
    await this.crmCustomerInfoService.moveToPool(body.id);
    return this.ok();
  }

  /** 设为 VIP */
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
   * 客户列表导入（老板按行指定业务员；业务员导入归本人）
   */
  @Post('/importData')
  async importData(
    @Body()
    body: {
      list: Partial<
        CrmCustomerInfoEntity & { salesmanId?: number; salesmanUsername?: string }
      >[];
    }
  ) {
    const n = await this.crmCustomerInfoService.importListRows(body.list || []);
    return this.ok(n);
  }
}
