import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { CrmQuoteBankAccountEntity } from '../../entity/quoteBankAccount';
import { CrmQuoteBankAccountService } from '../../service/quoteBankAccount';

@Provide()
@CoolController({
  prefix: '/admin/crmQuoteBankAccount',
  entity: CrmQuoteBankAccountEntity,
  service: CrmQuoteBankAccountService,
})
export class AdminCrmQuoteBankAccountController extends BaseController {
  @Inject()
  crmQuoteBankAccountService: CrmQuoteBankAccountService;

  @Post('/page')
  async pageQuery(@Body() query: any) {
    return this.ok(await this.crmQuoteBankAccountService.page(query));
  }

  @Post('/list')
  async listQuery(@Body() query: any) {
    return this.ok(await this.crmQuoteBankAccountService.list(query));
  }

  @Post('/options')
  async options() {
    return this.ok(await this.crmQuoteBankAccountService.options());
  }

  @Post('/detail')
  async detail(@Body() body: { id: number }) {
    return this.ok(await this.crmQuoteBankAccountService.info(Number(body?.id)));
  }

  @Post('/add')
  async addData(@Body() body: any) {
    return this.ok(await this.crmQuoteBankAccountService.add(body));
  }

  @Post('/update')
  async updateData(@Body() body: any) {
    return this.ok(await this.crmQuoteBankAccountService.update(body));
  }

  @Post('/delete')
  async deleteData(@Body() body: { ids: number[] | number }) {
    await this.crmQuoteBankAccountService.delete(body?.ids);
    return this.ok();
  }
}
