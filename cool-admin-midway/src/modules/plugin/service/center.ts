import {
  App,
  IMidwayApplication,
  Inject,
  InjectClient,
  Scope,
  Provide,
  ScopeEnum,
} from '@midwayjs/core';
import * as fs from 'fs';
import * as path from 'path';
import { PluginInfoEntity } from '../entity/info';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { PluginInfo } from '../interface';
import * as _ from 'lodash';
import { CachingFactory, MidwayCache } from '@midwayjs/cache-manager';
import { CoolEventManager } from '@cool-midway/core';
import { PluginService } from './info';

export const PLUGIN_CACHE_KEY = 'plugin:init';

export const EVENT_PLUGIN_READY = 'EVENT_PLUGIN_READY';

/**
 * 外掛中心
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class PluginCenterService {
  // 外掛列表
  plugins: Map<string, any> = new Map();

  // 外掛配置
  pluginInfos: Map<string, PluginInfo> = new Map();

  @App()
  app: IMidwayApplication;

  @InjectEntityModel(PluginInfoEntity)
  pluginInfoEntity: Repository<PluginInfoEntity>;

  @InjectClient(CachingFactory, 'default')
  midwayCache: MidwayCache;

  @Inject()
  coolEventManager: CoolEventManager;

  @Inject()
  pluginService: PluginService;

  /**
   * 初始化
   * @returns
   */
  async init() {
    this.plugins.clear();
    await this.initHooks();
    await this.initPlugin();
    this.coolEventManager.emit(EVENT_PLUGIN_READY);
  }

  /**
   * 初始化一個
   * @param keyName key名
   */
  async initOne(keyName: string) {
    await this.initPlugin({
      keyName,
    });
    this.coolEventManager.emit(EVENT_PLUGIN_READY, keyName);
  }

  /**
   * 移除外掛
   * @param keyName
   * @param isHook
   */
  async remove(keyName: string, isHook = false) {
    this.plugins.delete(keyName);
    this.pluginInfos.delete(keyName);
    if (isHook) {
      await this.initHooks();
    }
  }

  /**
   * 註冊外掛
   * @param key 唯一標識
   * @param cls 類
   * @param pluginInfo 外掛資訊
   */
  async register(key: string, cls: any, pluginInfo?: PluginInfo) {
    // 單例外掛
    if (pluginInfo?.singleton) {
      const instance = new cls();
      await instance.init(this.pluginInfos.get(key), null, this.app, {
        cache: this.midwayCache,
        pluginService: this.pluginService,
      });
      this.plugins.set(key, instance);
    } else {
      // 普通外掛
      this.plugins.set(key, cls);
    }
  }

  /**
   * 初始化鉤子
   */
  async initHooks() {
    const hooksPath = path.join(
      this.app.getBaseDir(),
      'modules',
      'plugin',
      'hooks'
    );
    for (const key of fs.readdirSync(hooksPath)) {
      const stat = fs.statSync(path.join(hooksPath, key));
      if (!stat.isDirectory()) {
        continue;
      }
      const { Plugin } = await import(path.join(hooksPath, key, 'index'));
      await this.register(key, Plugin);
      this.pluginInfos.set(key, {
        name: key,
        config: this.app.getConfig('module.plugin.hooks.' + key),
      });
    }
  }

  /**
   * 初始化外掛
   * @param condition 外掛條件
   */
  async initPlugin(condition?: {
    hook?: string;
    id?: number;
    keyName?: string;
  }) {
    let find: any = { status: 1 };
    if (condition) {
      find = {
        ...find,
        ...condition,
      };
    }
    const plugins = await this.pluginInfoEntity.find({
      where: find,
      select: [
        'id',
        'name',
        'description',
        'keyName',
        'hook',
        'version',
        'pluginJson',
        'config',
      ],
    });
    for (const plugin of plugins) {
      const data = await this.pluginService.getData(plugin.keyName);
      if (!data) {
        continue;
      }
      const instance = await this.getInstance(data.content.data);
      const pluginInfo = {
        ...plugin.pluginJson,
        config: this.getConfig(plugin.config),
      };
      if (plugin.hook) {
        this.pluginInfos.set(plugin.hook, pluginInfo);
        await this.register(plugin.hook, instance, pluginInfo);
      } else {
        this.pluginInfos.set(plugin.keyName, pluginInfo);
        await this.register(plugin.keyName, instance, pluginInfo);
      }
    }
  }

  /**
   * 獲得配置
   * @param config
   * @returns
   */
  private getConfig(config: any) {
    // 處理配置為字串的情況
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch (e) {
        return {};
      }
    }
    // 如果配置為空或非物件型別，則返回空物件
    if (!config || typeof config !== 'object') {
      return {};
    }
    const env = this.app.getEnv();
    let isMulti = false;
    for (const key in config) {
      if (key.includes('@')) {
        isMulti = true;
        break;
      }
    }
    return isMulti ? config[`@${env}`] : config;
  }

  /**
   * 獲得例項
   * @param content
   * @returns
   */
  async getInstance(content: string) {
    let _instance;
    const script = `
        ${content} 
        _instance = Plugin;
    `;
    eval(script);
    return _instance;
  }
}
