import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { CrmCustomerInfoEntity } from '../../entity/info';
import { CrmCustomerInfoService } from '../../service/info';

/**
 * 客戶管理 - 客戶公池
 */
@Provide()
@CoolController({
  prefix: '/admin/crmCustomerPool',
  api: ['add', 'delete', 'update', 'info', 'list'],
  entity: CrmCustomerInfoEntity,
  service: CrmCustomerInfoService,
})
export class AdminCrmCustomerPoolController extends BaseController {
  @Inject()
  crmCustomerInfoService: CrmCustomerInfoService;

  /**
   * 公池分頁（僅未分配業務員）
   */
  @Post('/page')
  async pageQuery(@Body() query: any) {
    return this.ok(await this.crmCustomerInfoService.page(query));
  }

  /**
   * 批次匯入
   */
  @Post('/importData')
  async importData(@Body() body: { list: Partial<CrmCustomerInfoEntity>[] }) {
    const n = await this.crmCustomerInfoService.importRows(body.list || []);
    return this.ok(n);
  }

  /**
   * 分配業務員（僅老闆/超管，且客戶當前在公池）
   */
  @Post('/assignSalesman')
  async assignSalesman(
    @Body() body: { id: number; salesmanId: number }
  ) {
    await this.crmCustomerInfoService.assignSalesman(body.id, body.salesmanId);
    return this.ok();
  }

  /**
   * 可分配的業務員使用者（角色 label = salesman）
   */
  @Post('/salesmenOptions')
  async salesmenOptions() {
    return this.ok(await this.crmCustomerInfoService.listSalesmenForAssign());
  }

  @Post('/sendMail')
  async sendMail(@Body() body: any) {
    return this.ok(await this.crmCustomerInfoService.sendPoolMail(body));
  }

}
