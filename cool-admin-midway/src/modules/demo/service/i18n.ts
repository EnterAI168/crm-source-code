import { Inject, Provide } from '@midwayjs/core';
import { BaseTranslateService } from '../../base/service/translate';

/**
 * 國際化服務
 */
@Provide()
export class DemoI18nService {
  @Inject()
  translate: BaseTranslateService;

  /**
   * 翻譯成英文
   */
  async en() {
    const value = this.translate.comm('一個很Cool的框架')['en'];
    console.log(value);
    return value;
  }

  /**
   * 翻譯成繁體
   */
  async tw() {
    const value = this.translate.comm('一個很Cool的框架')['zh-tw'];
    console.log(value);
    return value;
  }
}
