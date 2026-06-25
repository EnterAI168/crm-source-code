import { Body, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { CrmQuoteOrderEntity } from '../../../customer/entity/quoteOrder';
import { ProductProjectService } from '../../service/project';

@Provide()
@CoolController({
  prefix: '/admin/productProject',
  entity: CrmQuoteOrderEntity,
  service: ProductProjectService,
})
export class AdminProductProjectController extends BaseController {
  @Inject()
  productProjectService: ProductProjectService;

  @Post('/page')
  async pageQuery(@Body() query: any) {
    return this.ok(await this.productProjectService.page(query));
  }

  @Get('/info')
  async infoDetail(@Query('id') id: number) {
    return this.ok(await this.productProjectService.info(id));
  }

  @Post('/update')
  async updateData(@Body() body: any) {
    return this.ok(await this.productProjectService.update(body));
  }
}
