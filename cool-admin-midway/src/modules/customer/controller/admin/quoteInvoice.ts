import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
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

  @Inject()
  ctx: Context;

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

  @Post('/downloadPdf')
  async downloadPdf(@Body() body: any) {
    const file = await this.crmQuoteInvoiceService.downloadPdf(body);
    const fileName = encodeURIComponent(file.filename || '發票.pdf');
    this.ctx.set('Content-Type', file.contentType || 'application/pdf');
    this.ctx.set(
      'Content-Disposition',
      `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`
    );
    this.ctx.body = file.content;
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
