import { CoolController, BaseController } from '@cool-midway/core';
import { DemoI18nService } from '../../service/i18n';

/**
 * 國際化
 */
@CoolController({
  serviceApis: [
    {
      method: 'en',
      summary: '翻譯成英文',
    },
    {
      method: 'tw',
      summary: '翻譯成繁體',
    },
  ],
  service: DemoI18nService,
})
export class DemoI18nController extends BaseController {}
