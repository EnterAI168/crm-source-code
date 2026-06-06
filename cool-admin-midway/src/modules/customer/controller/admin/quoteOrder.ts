import { Body, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { BaseController, CoolController } from '@cool-midway/core';
import { CrmQuoteOrderEntity } from '../../entity/quoteOrder';
import { CrmQuoteOrderService } from '../../service/quoteOrder';

@Provide()
@CoolController({
  prefix: '/admin/crmQuoteOrder',
  entity: CrmQuoteOrderEntity,
  service: CrmQuoteOrderService,
})
export class AdminCrmQuoteOrderController extends BaseController {
  @Inject()
  crmQuoteOrderService: CrmQuoteOrderService;

  @Inject()
  ctx: Context;

  @Post('/page')
  async pageQuery(@Body() query: any) {
    return this.ok(await this.crmQuoteOrderService.page(query));
  }

  @Get('/info')
  async infoDetail(@Query('id') id: number) {
    return this.ok(await this.crmQuoteOrderService.info(id));
  }

  @Post('/add')
  async addData(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.add(body));
  }

  @Post('/update')
  async updateData(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.update(body));
  }

  @Post('/delete')
  async deleteData(@Body() body: { ids: number[] | number }) {
    await this.crmQuoteOrderService.delete(body?.ids);
    return this.ok();
  }

  @Post('/customerOptions')
  async customerOptions() {
    return this.ok(await this.crmQuoteOrderService.customerOptions());
  }

  @Post('/productOptions')
  async productOptions() {
    return this.ok(await this.crmQuoteOrderService.productOptions());
  }

  @Post('/assigneeOptions')
  async assigneeOptions() {
    return this.ok(await this.crmQuoteOrderService.assigneeOptions());
  }

  @Post('/duty')
  async duty() {
    return this.ok(await this.crmQuoteOrderService.duty());
  }

  @Post('/quoteTerms')
  async quoteTerms() {
    return this.ok(await this.crmQuoteOrderService.quoteTerms());
  }

  @Post('/submitAudit')
  async submitAudit(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.submitAudit(body));
  }

  @Post('/audit')
  async audit(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.audit(body));
  }

  @Post('/assign')
  async assign(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.assign(body));
  }

  @Post('/departmentAudits')
  async departmentAudits(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.departmentAudits(body));
  }

  @Post('/auditDepartment')
  async auditDepartment(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.auditDepartment(body));
  }

  @Post('/assignDepartment')
  async assignDepartment(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.assignDepartment(body));
  }

  @Post('/departmentAssigneeOptions')
  async departmentAssigneeOptions(@Body() body: any) {
    return this.ok(
      await this.crmQuoteOrderService.departmentAssigneeOptions(body)
    );
  }

  @Post('/submitDepartmentCosts')
  async submitDepartmentCosts(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.submitDepartmentCosts(body));
  }

  @Post('/sendQuote')
  async sendQuote(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.sendQuote(body));
  }

  @Post('/uploadContract')
  async uploadContract(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.uploadContract(body));
  }

  @Post('/caseMeetingScope')
  async caseMeetingScope() {
    return this.ok(await this.crmQuoteOrderService.caseMeetingScope());
  }

  @Post('/updateCaseMeeting')
  async updateCaseMeeting(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.updateCaseMeeting(body));
  }

  @Post('/downloadContract')
  async downloadContract(@Body() body: any) {
    const file = await this.crmQuoteOrderService.downloadContract(body);
    const fileName = encodeURIComponent(file.fileName);
    this.ctx.set('Content-Type', 'application/octet-stream');
    this.ctx.set(
      'Content-Disposition',
      `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`
    );
    this.ctx.body = file.buffer;
  }

  @Post('/receiptStages')
  async receiptStages(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.receiptStages(body));
  }

  @Post('/submitReceipt')
  async submitReceipt(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.submitReceipt(body));
  }

  @Post('/invoiceStages')
  async invoiceStages(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.invoiceStages(body));
  }

  @Post('/applyInvoice')
  async applyInvoice(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.applyInvoice(body));
  }

  @Post('/voidInvoice')
  async voidInvoice(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.voidInvoice(body));
  }

  @Post('/copyCreate')
  async copyCreate(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.copyCreate(body));
  }

  @Post('/quoteHistories')
  async quoteHistories(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.quoteHistories(body));
  }

  @Post('/quoteHistoryDetail')
  async quoteHistoryDetail(@Body() body: any) {
    return this.ok(await this.crmQuoteOrderService.quoteHistoryDetail(body));
  }

  @Post('/quoteHistoryPdf')
  async quoteHistoryPdf(@Body() body: any) {
    const file = await this.crmQuoteOrderService.quoteHistoryPdf(body);
    const fileName = encodeURIComponent(file.fileName);
    this.ctx.set('Content-Type', 'application/pdf');
    this.ctx.set(
      'Content-Disposition',
      `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`
    );
    this.ctx.body = file.buffer;
  }

  @Post('/nextNo')
  async nextNo() {
    return this.ok(await this.crmQuoteOrderService.nextNo());
  }
}
