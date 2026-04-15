import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { CrmCustomerInfoEntity } from '../../entity/info';
import { CrmCustomerInfoService } from '../../service/info';

/**
 * 客户管理 - 客户公池
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
   * 公池分页（仅未分配业务员）
   */
  @Post('/page')
  async pageQuery(@Body() query: any) {
    return this.ok(await this.crmCustomerInfoService.page(query));
  }

  /**
   * 批量导入
   */
  @Post('/importData')
  async importData(@Body() body: { list: Partial<CrmCustomerInfoEntity>[] }) {
    const n = await this.crmCustomerInfoService.importRows(body.list || []);
    return this.ok(n);
  }

  /**
   * 分配业务员（仅老板/超管，且客户当前在公池）
   */
  @Post('/assignSalesman')
  async assignSalesman(
    @Body() body: { id: number; salesmanId: number }
  ) {
    await this.crmCustomerInfoService.assignSalesman(body.id, body.salesmanId);
    return this.ok();
  }

  /**
   * 可分配的业务员用户（角色 label = salesman）
   */
  @Post('/salesmenOptions')
  async salesmenOptions() {
    return this.ok(await this.crmCustomerInfoService.listSalesmenForAssign());
  }
}
