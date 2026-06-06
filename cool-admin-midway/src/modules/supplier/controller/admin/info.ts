import { Body, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { CrmSupplierInfoEntity } from '../../entity/info';
import { CrmSupplierInfoService } from '../../service/info';

@Provide()
@CoolController({
  prefix: '/admin/crmSupplier',
  entity: CrmSupplierInfoEntity,
  service: CrmSupplierInfoService,
})
export class AdminCrmSupplierInfoController extends BaseController {
  @Inject()
  crmSupplierInfoService: CrmSupplierInfoService;

  @Post('/page')
  async pageQuery(@Body() query: any) {
    return this.ok(await this.crmSupplierInfoService.page(query));
  }

  @Get('/info')
  async infoDetail(@Query('id') id: number) {
    return this.ok(await this.crmSupplierInfoService.info(id));
  }

  @Post('/add')
  async addData(@Body() body: any) {
    return this.ok(await this.crmSupplierInfoService.add(body));
  }

  @Post('/update')
  async updateData(@Body() body: any) {
    return this.ok(await this.crmSupplierInfoService.update(body));
  }

  @Post('/delete')
  async deleteData(@Body() body: { ids: number[] | number }) {
    await this.crmSupplierInfoService.delete(body?.ids);
    return this.ok();
  }
}
