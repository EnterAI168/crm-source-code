import { Body, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { CrmRemittanceEntity } from '../../entity/remittance';
import { CrmRemittanceService } from '../../service/remittance';

@Provide()
@CoolController({
  prefix: '/admin/crmRemittance',
  entity: CrmRemittanceEntity,
  service: CrmRemittanceService,
})
export class AdminCrmRemittanceController extends BaseController {
  @Inject()
  crmRemittanceService: CrmRemittanceService;

  @Post('/page')
  async pageQuery(@Body() query: any) {
    return this.ok(await this.crmRemittanceService.page(query));
  }

  @Get('/info')
  async infoDetail(@Query('id') id: number) {
    return this.ok(await this.crmRemittanceService.info(id));
  }

  @Post('/add')
  async addData(@Body() body: any) {
    return this.ok(await this.crmRemittanceService.add(body));
  }

  @Post('/update')
  async updateData(@Body() body: any) {
    return this.ok(await this.crmRemittanceService.update(body));
  }

  @Post('/delete')
  async deleteData(@Body() body: { ids: number[] | number }) {
    await this.crmRemittanceService.delete(body?.ids);
    return this.ok();
  }

  @Post('/remittanceStages')
  async remittanceStages(@Body() body: any) {
    return this.ok(await this.crmRemittanceService.remittanceStages(body));
  }

  @Post('/submitRemittance')
  async submitRemittance(@Body() body: any) {
    return this.ok(await this.crmRemittanceService.submitRemittance(body));
  }

  @Post('/updateReceivedStatus')
  async updateReceivedStatus(@Body() body: any) {
    return this.ok(await this.crmRemittanceService.updateReceivedStatus(body));
  }

  @Post('/quoteOrderOptions')
  async quoteOrderOptions() {
    return this.ok(await this.crmRemittanceService.quoteOrderOptions());
  }

  @Post('/supplierOptions')
  async supplierOptions() {
    return this.ok(await this.crmRemittanceService.supplierOptions());
  }

  @Post('/nextNo')
  async nextNo() {
    return this.ok(await this.crmRemittanceService.nextNo());
  }
}
