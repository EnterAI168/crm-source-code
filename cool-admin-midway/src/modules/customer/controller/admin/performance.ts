import { Body, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { CrmPerformanceEntity } from '../../entity/performance';
import { CrmPerformanceService } from '../../service/performance';

@Provide()
@CoolController({
  prefix: '/admin/crmPerformance',
  entity: CrmPerformanceEntity,
  service: CrmPerformanceService,
})
export class AdminCrmPerformanceController extends BaseController {
  @Inject()
  crmPerformanceService: CrmPerformanceService;

  @Post('/page')
  async pageQuery(@Body() query: any) {
    return this.ok(await this.crmPerformanceService.page(query));
  }

  @Get('/info')
  async infoDetail(@Query('id') id: number) {
    return this.ok(await this.crmPerformanceService.info(id));
  }

  @Post('/expectedDetail')
  async expectedDetail(@Body() body: any) {
    return this.ok(await this.crmPerformanceService.detail(body, 'expected'));
  }

  @Post('/actualDetail')
  async actualDetail(@Body() body: any) {
    return this.ok(await this.crmPerformanceService.detail(body, 'actual'));
  }

  @Post('/internalDetail')
  async internalDetail(@Body() body: any) {
    return this.ok(await this.crmPerformanceService.internalDetail(body));
  }

  @Post('/bonusAccountingPage')
  async bonusAccountingPage(@Body() body: any) {
    return this.ok(await this.crmPerformanceService.bonusAccountingPage(body));
  }

  @Post('/bonusAccountingDetail')
  async bonusAccountingDetail(@Body() body: any) {
    return this.ok(
      await this.crmPerformanceService.bonusAccountingDetail(body)
    );
  }

  @Post('/annualAssessmentPage')
  async annualAssessmentPage(@Body() body: any) {
    return this.ok(
      await this.crmPerformanceService.annualAssessmentPage(body)
    );
  }

  @Post('/annualAssessmentDetail')
  async annualAssessmentDetail(@Body() body: any) {
    return this.ok(
      await this.crmPerformanceService.annualAssessmentDetail(body)
    );
  }

  @Post('/syncMonth')
  async syncMonth(@Body() body: any) {
    return this.ok(
      await this.crmPerformanceService.manualSyncMonth(body?.month)
    );
  }

  @Post('/platformStatistics')
  async platformStatistics() {
    return this.ok(await this.crmPerformanceService.platformStatistics());
  }

  @Post('/invoiceStatistics')
  async invoiceStatistics() {
    return this.ok(await this.crmPerformanceService.invoiceStatistics());
  }

  @Post('/internalStatistics')
  async internalStatistics() {
    return this.ok(await this.crmPerformanceService.internalStatistics());
  }
}
