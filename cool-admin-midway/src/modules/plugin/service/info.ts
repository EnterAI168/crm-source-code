import {
  BaseService,
  CoolCommException,
  CoolEventManager,
} from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Equal, In, Not, Repository } from 'typeorm';
import { PluginInfoEntity } from '../entity/info';
import {
  App,
  Config,
  ILogger,
  IMidwayApplication,
  IMidwayContext,
  Inject,
  InjectClient,
  Logger,
  Provide,
} from '@midwayjs/core';
import * as _ from 'lodash';
import { PluginInfo } from '../interface';
import { PluginCenterService } from './center';
import { CachingFactory, MidwayCache } from '@midwayjs/cache-manager';
import {
  GLOBAL_EVENT_PLUGIN_INIT,
  GLOBAL_EVENT_PLUGIN_REMOVE,
} from '../event/init';
import { PluginMap, AnyString } from '../../../../typings/plugin';
import { PluginTypesService } from './types';
import * as path from 'path';
import * as fs from 'fs';
import { pPluginPath } from '../../../comm/path';
/**
 * 外掛資訊
 */
@Provide()
export class PluginService extends BaseService {
  @InjectEntityModel(PluginInfoEntity)
  pluginInfoEntity: Repository<PluginInfoEntity>;

  @Inject()
  ctx: IMidwayContext;

  @App()
  app: IMidwayApplication;

  @Inject()
  pluginCenterService: PluginCenterService;

  @Config('module.plugin.hooks')
  hooksConfig;

  @InjectClient(CachingFactory, 'default')
  midwayCache: MidwayCache;

  @Inject()
  coolEventManager: CoolEventManager;

  @Inject()
  pluginTypesService: PluginTypesService;

  @Logger()
  logger: ILogger;

  /**
   * 新增或更新
   * @param param
   * @param type
   */
  async addOrUpdate(param: any, type?: 'add' | 'update') {
    await super.addOrUpdate(param, type);
    const info = await this.pluginInfoEntity
      .createQueryBuilder('a')
      .select(['a.id', 'a.keyName', 'a.status', 'a.hook'])
      .where({
        id: Equal(param.id),
      })
      .getOne();
    if (info.status == 1) {
      await this.reInit(info.keyName);
    } else {
      await this.remove(info.keyName, !!info.hook);
    }
  }

  /**
   * 重新初始化外掛
   */
  async reInit(keyName: string) {
    // 多程式發送全域性事件，pm2下生效，本地開發則通過普通事件
    this.coolEventManager.globalEmit(GLOBAL_EVENT_PLUGIN_INIT, false, keyName);
  }

  /**
   * 移除外掛
   * @param keyName
   * @param isHook
   */
  async remove(keyName: string, isHook = false) {
    // 多程式發送全域性事件，pm2下生效
    this.coolEventManager.globalEmit(
      GLOBAL_EVENT_PLUGIN_REMOVE,
      false,
      keyName,
      isHook
    );
    this.pluginTypesService.deleteDtsFile(keyName);
  }

  /**
   * 刪除不經過回收站
   * @param ids
   */
  async delete(ids: any) {
    const list = await this.pluginInfoEntity.findBy({ id: In(ids) });
    for (const item of list) {
      await this.remove(item.keyName, !!item.hook);
      // 刪除檔案
      await this.deleteData(item.keyName);
    }
    await this.pluginInfoEntity.delete(ids);
  }

  /**
   * 更新
   * @param param
   */
  async update(param: any) {
    const old = await this.pluginInfoEntity.findOne({
      where: { id: param.id },
      select: ['id', 'status', 'hook'],
    });
    // 啟用外掛，停用同名外掛
    if (old.hook && param.status == 1 && old.status != param.status) {
      await this.pluginInfoEntity.update(
        { hook: old.hook, status: 1, id: Not(old.id) },
        { status: 0 }
      );
    }
    await super.update(param);
  }

  /**
   * 獲得外掛配置
   * @param key
   */
  async getConfig(key: string) {
    return this.pluginCenterService.pluginInfos.get(key)?.config;
  }

  /**
   * 呼叫外掛
   * @param key 外掛key
   * @param method 方法
   * @param params 參數
   * @returns
   */
  async invoke<K extends keyof PluginMap>(
    key: K | AnyString,
    method: string,
    ...params
  ) {
    // 例項
    const instance: any = await this.getInstance(key);
    return await instance[method](...params);
  }

  /**
   * 獲得外掛例項
   * @param key
   * @returns
   */
  async getInstance<K extends keyof PluginMap>(
    key: K | AnyString
  ): Promise<K extends keyof PluginMap ? PluginMap[K] : any> {
    const check = await this.checkStatus(key);
    if (!check) throw new CoolCommException(`外掛[${key}]不存在或已停用`);
    let instance;
    const pluginInfo = this.pluginCenterService.pluginInfos.get(key);
    if (pluginInfo.singleton) {
      instance = this.pluginCenterService.plugins.get(key);
    } else {
      instance = new (await this.pluginCenterService.plugins.get(key))();
      await instance.init(pluginInfo, this.ctx, this.app, {
        cache: this.midwayCache,
        pluginService: this,
      });
    }
    return instance;
  }

  /**
   * 檢查狀態
   * @param key
   */
  async checkStatus(key: string) {
    if (Object.keys(this.hooksConfig).includes(key)) {
      return true;
    }
    const info = await this.pluginInfoEntity
      .createQueryBuilder('a')
      .select(['a.id', 'a.status'])
      .where({ status: 1, keyName: Equal(key) })
      .getOne();

    return !!info;
  }

  /**
   * 檢查
   * @param filePath
   */
  async check(filePath: string) {
    let data;
    try {
      data = await this.data(filePath);
    } catch (e) {
      return {
        type: 0,
        message: `外掛資訊不完整，請檢查${data?.errorData || ''}`,
      };
    }
    const check = await this.pluginInfoEntity.findOne({
      where: { keyName: Equal(data.pluginJson.key) },
      select: ['id', 'hook', 'status'],
    });
    if (check && !check.hook) {
      return {
        type: 1,
        message: '外掛已存在，繼續安裝將覆蓋',
      };
    }
    if (check && check.hook && check.status == 1) {
      return {
        type: 2,
        message:
          '已存在同名Hook外掛，你可以繼續安裝，但是多個相同的Hook外掛只能同時開啟一個',
      };
    }
    return {
      type: 3,
      message: '檢查通過',
    };
  }

  /**
   * 獲得外掛資料
   * @param filePath
   */
  async data(filePath: string): Promise<{
    pluginJson: any;
    readme: string;
    logo: string;
    content: string;
    tsContent: string;
    errorData: string;
  }> {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePath);
    const files = zip.getEntries();
    let errorData;
    let pluginJson: PluginInfo,
      readme: string,
      logo: string,
      content: string,
      tsContent: string;

    try {
      // 通用方法獲取檔案內容
      const getFileContent = (
        entryName: string,
        encoding: 'utf-8' | 'base64' = 'utf-8'
      ) => {
        const file = _.find(files, { entryName });
        if (!file) {
          throw new Error(`File ${entryName} not found`);
        }
        return file?.getData()?.toString(encoding);
      };

      errorData = 'plugin.json';
      pluginJson = JSON.parse(getFileContent('plugin.json'));

      errorData = 'readme';
      readme = getFileContent(pluginJson.readme);

      errorData = 'logo';
      logo = getFileContent(pluginJson.logo, 'base64');

      errorData = 'content';
      content = getFileContent('src/index.js');

      tsContent = getFileContent('source/index.ts');
    } catch (e) {
      throw new CoolCommException('外掛資訊不完整');
    }
    return {
      pluginJson,
      readme,
      logo,
      content,
      tsContent,
      errorData,
    };
  }

  /**
   * 安裝外掛
   * @param file 檔案
   * @param force 是否強制安裝
   */
  async install(filePath: string, force = false) {
    const forceBool = typeof force === 'string' ? force === 'true' : force;
    const checkResult = await this.check(filePath);
    if (checkResult.type != 3 && !forceBool) {
      return checkResult;
    }
    const { pluginJson, readme, logo, content, tsContent } = await this.data(
      filePath
    );
    if (pluginJson.key == 'plugin') {
      throw new CoolCommException('外掛key不能為plugin，請更換其他key');
    }
    const check = await this.pluginInfoEntity.findOne({
      where: { keyName: Equal(pluginJson.key) },
      select: ['id', 'status', 'config'],
    });
    const data = {
      name: pluginJson.name,
      keyName: pluginJson.key,
      version: pluginJson.version,
      author: pluginJson.author,
      hook: pluginJson.hook,
      readme,
      logo,
      content: {
        type: 'comm',
        data: content,
      },
      tsContent: {
        type: 'ts',
        data: tsContent,
      },
      description: pluginJson.description,
      pluginJson,
      config: pluginJson.config,
      status: 1,
    } as PluginInfoEntity;
    // 存在同名外掛，更新，保留配置
    if (check) {
      await this.pluginInfoEntity.update(check.id, {
        ...data,
        status: check.status,
        config: {
          ...pluginJson.config,
          ...check.config,
        },
      });
    } else {
      // 全新安裝
      await this.pluginInfoEntity.insert(data);
    }
    // 儲存外掛內容
    await this.saveData(
      {
        content: {
          type: 'comm',
          data: content,
        },
        tsContent: {
          type: 'ts',
          data: tsContent,
        },
      },
      pluginJson.key
    );
    this.pluginTypesService.generateDtsFile(pluginJson.key, tsContent);
    // 初始化外掛
    await this.reInit(pluginJson.key);
  }

  /**
   * 將外掛內容儲存到檔案
   * @param content 內容
   * @param keyName 外掛key
   */
  async saveData(
    data: {
      content: {
        type: 'comm' | 'module';
        data: string;
      };
      tsContent: {
        type: 'ts';
        data: string;
      };
    },
    keyName: string
  ) {
    const filePath = this.pluginPath(keyName);
    // 確保目錄存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // 寫入檔案，如果存在則覆蓋
    fs.writeFileSync(filePath, JSON.stringify(data, null, 0), { flag: 'w' });
  }

  /**
   * 獲得外掛資料
   * @param keyName
   * @returns
   */
  async getData(keyName: string): Promise<{
    content: {
      type: 'comm' | 'module';
      data: string;
    };
    tsContent: {
      type: 'ts';
      data: string;
    };
  }> {
    const filePath = this.pluginPath(keyName);
    if (!fs.existsSync(filePath)) {
      // 嘗試從資料庫中獲取
      const info = await this.pluginInfoEntity.findOne({
        where: { keyName: Equal(keyName) },
        select: ['content', 'tsContent'],
      });
      if (info) {
        // 儲存外掛到檔案
        this.saveData(
          {
            content: info.content,
            tsContent: info.tsContent,
          },
          keyName
        );
        return {
          content: info.content,
          tsContent: info.tsContent,
        };
      } else {
        this.logger.warn(
          `外掛[${keyName}]檔案不存在，請解除安裝後重新安裝: ${filePath}`
        );
        return;
      }
    }
    return JSON.parse(await fs.promises.readFile(filePath, 'utf-8'));
  }

  /**
   * 刪除外掛
   * @param keyName
   */
  async deleteData(keyName: string) {
    const filePath = this.pluginPath(keyName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * 獲得外掛路徑
   * @param keyName
   * @returns
   */
  pluginPath(keyName: string) {
    return path.join(pPluginPath(), `${keyName}`);
  }
}
