import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { CrmBonusConfigEntity } from '../../entity/bonusConfig';
import { CrmBonusConfigService } from '../../service/bonusConfig';

@Provide()
@CoolController({
  prefix: '/admin/crmBonusConfig',
  entity: CrmBonusConfigEntity,
  service: CrmBonusConfigService,
})
export class AdminCrmBonusConfigController extends BaseController {
  @Inject()
  crmBonusConfigService: CrmBonusConfigService;

  @Post('/page')
  async pageQuery(@Body() query: any) {
    return this.ok(await this.crmBonusConfigService.page(query));
  }

  @Post('/list')
  async listQuery(@Body() query: any) {
    return this.ok(await this.crmBonusConfigService.list(query));
  }

  @Post('/add')
  async addData(@Body() body: any) {
    return this.ok(await this.crmBonusConfigService.add(body));
  }

  @Post('/update')
  async updateData(@Body() body: any) {
    return this.ok(await this.crmBonusConfigService.update(body));
  }

  @Post('/delete')
  async deleteData(@Body() body: { ids: number[] | number }) {
    await this.crmBonusConfigService.delete(body?.ids);
    return this.ok();
  }

  @Post('/initDefault')
  async initDefault() {
    return this.ok(await this.crmBonusConfigService.initDefaultConfigs());
  }
}
