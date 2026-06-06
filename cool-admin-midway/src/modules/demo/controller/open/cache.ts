import { DemoCacheService } from '../../service/cache';
import { Inject, Post, Provide, Get, InjectClient } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { CachingFactory, MidwayCache } from '@midwayjs/cache-manager';

/**
 * 快取
 */
@CoolController()
export class OpenDemoCacheController extends BaseController {
  @InjectClient(CachingFactory, 'default')
  midwayCache: MidwayCache;

  @Inject()
  demoCacheService: DemoCacheService;

  /**
   * 設定快取
   * @returns
   */
  @Post('/set', { summary: '設定快取' })
  async set() {
    await this.midwayCache.set('a', 1);
    // 快取10秒
    await this.midwayCache.set('a', 1, 10 * 1000);
    return this.ok(await this.midwayCache.get('a'));
  }

  /**
   * 獲得快取
   * @returns
   */
  @Get('/get', { summary: '獲得快取' })
  async get() {
    return this.ok(await this.demoCacheService.get());
  }
}
