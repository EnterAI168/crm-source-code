import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { CrmQuoteInvoiceEntity } from '../../entity/quoteInvoice';
import { CrmQuoteInvoiceService } from '../../service/quoteInvoice';

@Provide()
@CoolController({
  prefix: '/admin/crmQuoteInvoice',
  entity: CrmQuoteInvoiceEntity,
  service: CrmQuoteInvoiceService,
})
export class AdminCrmQuoteInvoiceController extends BaseController {
  @Inject()
  crmQuoteInvoiceService: CrmQuoteInvoiceService;

  @Post('/page')
  async pageQuery(@Body() body: any) {
    return this.ok(await this.crmQuoteInvoiceService.page(body));
  }

  @Post('/info')
  async infoDetail(@Body() body: any) {
    return this.ok(await this.crmQuoteInvoiceService.info(body));
  }

  @Post('/audit')
  async audit(@Body() body: any) {
    return this.ok(await this.crmQuoteInvoiceService.audit(body));
  }

  @Post('/preview')
  async preview(@Body() body: any) {
    return this.ok(await this.crmQuoteInvoiceService.preview(body));
  }

  @Post('/send')
  async send(@Body() body: any) {
    return this.ok(await this.crmQuoteInvoiceService.send(body));
  }

  @Post('/handleScheduled')
  async handleScheduled() {
    return this.ok(await this.crmQuoteInvoiceService.handleScheduledInvoices());
  }

  @Post('/ecpayDiagnose')
  async ecpayDiagnose() {
    return this.ok(await this.crmQuoteInvoiceService.ecpayDiagnose());
  }
}
