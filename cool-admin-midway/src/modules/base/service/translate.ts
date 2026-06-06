import { I18N } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseSysMenuEntity } from '../entity/sys/menu';
import {
  App,
  Config,
  ILogger,
  IMidwayApplication,
  Inject,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/core';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { DictInfoEntity } from '../../dict/entity/info';
import { DictTypeEntity } from '../../dict/entity/type';
/**
 * 翻譯服務
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class BaseTranslateService {
  @InjectEntityModel(BaseSysMenuEntity)
  baseSysMenuEntity: Repository<BaseSysMenuEntity>;

  @InjectEntityModel(DictInfoEntity)
  dictInfoEntity: Repository<DictInfoEntity>;

  @InjectEntityModel(DictTypeEntity)
  dictTypeEntity: Repository<DictTypeEntity>;

  // 基礎路徑
  basePath: string;

  @App()
  app: IMidwayApplication;

  @Inject()
  logger: ILogger;

  @Config('cool.i18n')
  config: {
    /** 是否開啟 */
    enable: boolean;
    /** 語言 */
    languages: string[];
    /** 翻譯服務 */
    serviceUrl?: string;
  };

  menuMap: Record<string, string> = {};

  msgMap: Record<string, string> = {};

  commMap: Record<string, string> = {};

  // 新增字典對映
  dictMap: Record<string, string> = {};

  /**
   * 檢查是否存在鎖檔案
   */
  private checkLockFile(type: 'menu' | 'msg' | 'comm'): boolean {
    const lockFile = path.join(this.basePath, type, '.lock');
    return fs.existsSync(lockFile);
  }

  /**
   * 建立鎖檔案
   */
  private createLockFile(type: 'menu' | 'msg' | 'comm'): void {
    const lockFile = path.join(this.basePath, type, '.lock');
    fs.writeFileSync(lockFile, new Date().toISOString());
  }

  /**
   * 載入翻譯檔案到記憶體
   */
  async loadTranslations() {
    if (!this.config?.enable) {
      return;
    }
    if (!this.basePath) {
      this.basePath = path.join(this.app.getBaseDir(), '..', 'src', 'locales');
    }

    // 清空現有對映
    this.menuMap = {};
    this.msgMap = {};
    this.dictMap = {};
    this.commMap = {};
    // 載入選單翻譯
    await this.loadTypeTranslations('menu', this.menuMap);

    // 載入訊息翻譯
    await this.loadTypeTranslations('msg', this.msgMap);

    // 載入通用訊息翻譯
    await this.loadTypeTranslations('comm', this.commMap);

    // 載入字典翻譯
    await this.loadDictTranslations();
  }

  /**
   * 載入指定型別的翻譯
   * @param type 翻譯型別
   * @param map 對映物件
   */
  private async loadTypeTranslations(
    type: 'menu' | 'msg' | 'comm',
    map: Record<string, string>
  ) {
    const dirPath = path.join(this.basePath, type);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const language = file.replace('.json', '');
          const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
          const translations = JSON.parse(content);
          for (const [key, value] of Object.entries(translations)) {
            map[`${language}:${key}`] = value as string;
          }
        }
      }
    }
  }

  /**
   * 載入字典翻譯
   */
  private async loadDictTranslations() {
    const dictTypes = ['info', 'type'];

    for (const dictType of dictTypes) {
      const dirPath = path.join(this.basePath, 'dict', dictType);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const language = file.replace('.json', '');
            const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
            const translations = JSON.parse(content);
            for (const [key, value] of Object.entries(translations)) {
              this.dictMap[`${language}:dict:${dictType}:${key}`] =
                value as string;
            }
          }
        }
      }
    }
  }

  /**
   * 更新翻譯對映
   * @param type 型別 menu | msg
   * @param language 語言
   */
  async updateTranslationMap(type: 'menu' | 'msg', language: string) {
    const dirPath = path.join(this.basePath, type);
    const file = path.join(dirPath, `${language}.json`);

    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const translations = JSON.parse(content);
      const map = type === 'menu' ? this.menuMap : this.msgMap;

      for (const [key, value] of Object.entries(translations)) {
        map[`${language}:${key}`] = value as string;
      }
    }
  }

  /**
   * 翻譯
   * @param type 型別 menu | msg | dict
   * @param language 語言
   * @param text 原文
   * @returns 翻譯後的文本
   */
  translate(
    type: 'menu' | 'msg' | 'dict:info' | 'dict:type' | 'comm',
    language: string,
    text: string
  ): string {
    // 處理字典翻譯
    if (type === 'dict:info' || type === 'dict:type') {
      const key = `${language}:${type}:${text}`;
      return this.dictMap[key] || text.split(':').pop() || text;
    }

    // 處理選單和訊息翻譯
    const map = type === 'menu' ? this.menuMap : this.msgMap;
    const key = `${language}:${text}`;
    return map[key] || text;
  }

  /**
   * 檢查翻譯
   */
  async check() {
    if (this.config?.enable && this.app.getEnv() == 'local') {
      this.basePath = path.join(this.app.getBaseDir(), '..', 'src', 'locales');
      const menuLockExists = this.checkLockFile('menu');
      const msgLockExists = this.checkLockFile('msg');
      const commLockExists = this.checkLockFile('comm');
      const dictLockExists = this.checkDictLockFile();

      if (
        !menuLockExists ||
        !msgLockExists ||
        !dictLockExists ||
        !commLockExists
      ) {
        const tasks = [];
        if (!msgLockExists) {
          tasks.push(this.genBaseMsg());
        }
        if (!menuLockExists) {
          tasks.push(this.genBaseMenu());
        }
        if (!dictLockExists) {
          tasks.push(this.genBaseDict());
        }
        if (!commLockExists) {
          tasks.push(this.genCommMsg());
        }
        // 啟動旋轉動畫
        const spinner = ['|', '/', '-', '\\'];
        let index = 0;
        const interval = setInterval(() => {
          process.stdout.write(`\r${spinner[index++]} i18n translate...`);
          index %= spinner.length;
        }, 200);
        try {
          await Promise.all(tasks);
        } finally {
          clearInterval(interval);
          // 載入翻譯檔案到記憶體
          await this.loadTranslations();
          await this.loadDictTranslations();
          process.stdout.write('\r✅ i18n translate success！！！\n');
        }
      } else {
        this.logger.debug('Translation lock files exist, skipping translation');
        // 直接載入翻譯檔案到記憶體
        await this.loadTranslations();
        await this.loadDictTranslations();
      }
    }
  }

  /**
   * 檢查字典鎖檔案
   */
  private checkDictLockFile(): boolean {
    const lockFile = path.join(this.basePath, 'dict', '.lock');
    return fs.existsSync(lockFile);
  }

  /**
   * 建立字典鎖檔案
   */
  private createDictLockFile(): void {
    const lockFile = path.join(this.basePath, 'dict', '.lock');
    fs.writeFileSync(lockFile, new Date().toISOString());
  }

  /**
   * 生成基礎字典
   */
  async genBaseDict() {
    try {
      // 檢查是否存在鎖檔案
      if (this.checkDictLockFile()) {
        this.logger.debug('Dictionary lock file exists, skipping translation');
        return;
      }

      const infos = await this.dictInfoEntity.find();
      const types = await this.dictTypeEntity.find();

      // 確保目錄存在
      const infoDir = path.join(this.basePath, 'dict', 'info');
      const typeDir = path.join(this.basePath, 'dict', 'type');
      fs.mkdirSync(infoDir, { recursive: true });
      fs.mkdirSync(typeDir, { recursive: true });

      // 生成中文基礎檔案
      const infoContent = {};
      const typeContent = {};

      for (const info of infos) {
        infoContent[info.name] = info.name;
      }
      for (const type of types) {
        typeContent[type.name] = type.name;
      }

      const infoFile = path.join(infoDir, 'zh-cn.json');
      const typeFile = path.join(typeDir, 'zh-cn.json');

      const infoText = JSON.stringify(infoContent, null, 2);
      const typeText = JSON.stringify(typeContent, null, 2);

      fs.writeFileSync(infoFile, infoText);
      fs.writeFileSync(typeFile, typeText);

      this.logger.debug('Base dictionary files generated successfully');

      // 翻譯其他語言
      if (this.config?.enable && this.config.languages) {
        const translatePromises = [];

        for (const language of this.config.languages) {
          if (language !== 'zh-cn') {
            // 翻譯 info 字典
            translatePromises.push(
              this.invokeTranslate(infoText, language, infoDir, 'dict')
            );

            // 翻譯 type 字典
            translatePromises.push(
              this.invokeTranslate(typeText, language, typeDir, 'dict')
            );
          }
        }

        await Promise.all(translatePromises);
        this.logger.debug('Dictionary translations completed successfully');
      }

      // 建立鎖檔案
      this.createDictLockFile();

      // 更新翻譯對映
      await this.loadDictTranslations();
    } catch (error) {
      this.logger.error('Failed to generate dictionary:', error);
      throw error;
    }
  }

  /**
   * 更新字典翻譯對映
   * @param language 語言
   */
  async updateDictTranslationMap(language: string) {
    const infoFile = path.join(
      this.basePath,
      'dict',
      'info',
      `${language}.json`
    );
    const typeFile = path.join(
      this.basePath,
      'dict',
      'type',
      `${language}.json`
    );

    if (fs.existsSync(infoFile)) {
      const content = fs.readFileSync(infoFile, 'utf-8');
      const translations = JSON.parse(content);
      for (const [key, value] of Object.entries(translations)) {
        this.dictMap[`${language}:dict:info:${key}`] = value as string;
      }
    }

    if (fs.existsSync(typeFile)) {
      const content = fs.readFileSync(typeFile, 'utf-8');
      const translations = JSON.parse(content);
      for (const [key, value] of Object.entries(translations)) {
        this.dictMap[`${language}:dict:type:${key}`] = value as string;
      }
    }
  }

  /**
   * 生成基礎選單
   */
  async genBaseMenu() {
    const menus = await this.baseSysMenuEntity.find();
    const file = path.join(this.basePath, 'menu', 'zh-cn.json');
    const content = {};
    for (const menu of menus) {
      content[menu.name] = menu.name;
    }
    // 確保目錄存在
    const msgDir = path.dirname(file);
    if (!fs.existsSync(msgDir)) {
      fs.mkdirSync(msgDir, { recursive: true });
    }
    const text = JSON.stringify(content, null, 2);
    fs.writeFileSync(file, text);
    this.logger.debug('base menu generate success');
    const translatePromises = [];
    for (const language of this.config.languages) {
      if (language !== 'zh-cn') {
        translatePromises.push(
          this.invokeTranslate(
            text,
            language,
            path.join(this.basePath, 'menu'),
            'menu'
          )
        );
      }
    }
    await Promise.all(translatePromises);
    this.createLockFile('menu');
  }

  /**
   * 生成基礎訊息
   */
  async genBaseMsg() {
    const file = path.join(this.basePath, 'msg', 'zh-cn.json');
    const scanPath = path.join(this.app.getBaseDir(), '..', 'src', 'modules');
    const messages = {};

    // 遞迴掃描目錄
    const scanDir = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const matches = content.match(
            /throw new CoolCommException\((['"])(.*?)\1\)/g
          );
          if (matches) {
            matches.forEach(match => {
              const message = match.match(/(['"])(.*?)\1/)[2];
              messages[message] = message;
            });
          }
        }
      }
    };

    // 開始掃描
    scanDir(scanPath);

    // 確保目錄存在
    const msgDir = path.dirname(file);
    if (!fs.existsSync(msgDir)) {
      fs.mkdirSync(msgDir, { recursive: true });
    }

    // 寫入檔案
    const text = JSON.stringify(messages, null, 2);
    fs.writeFileSync(file, text);
    this.logger.debug('base msg generate success');

    const translatePromises = [];
    for (const language of this.config.languages) {
      if (language !== 'zh-cn') {
        translatePromises.push(
          this.invokeTranslate(
            text,
            language,
            path.join(this.basePath, 'msg'),
            'msg'
          )
        );
      }
    }
    await Promise.all(translatePromises);
    this.createLockFile('msg');
  }

  /**
   * 生成通用訊息
   */
  async genCommMsg() {
    const file = path.join(this.basePath, 'comm', 'zh-cn.json');
    const scanPath = path.join(this.app.getBaseDir(), '..', 'src', 'modules');
    const messages = {};

    // 遞迴掃描目錄
    const scanDir = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const matches = content.match(
            /this.translate.comm\((['"])(.*?)\1\)/g
          );
          if (matches) {
            matches.forEach(match => {
              const message = match.match(/(['"])(.*?)\1/)[2];
              messages[message] = message;
            });
          }
        }
      }
    };

    // 開始掃描
    scanDir(scanPath);

    // 確保目錄存在
    const msgDir = path.dirname(file);
    if (!fs.existsSync(msgDir)) {
      fs.mkdirSync(msgDir, { recursive: true });
    }

    // 寫入檔案
    const text = JSON.stringify(messages, null, 2);
    fs.writeFileSync(file, text);
    this.logger.debug('base comm generate success');

    const translatePromises = [];
    for (const language of this.config.languages) {
      if (language !== 'zh-cn') {
        translatePromises.push(
          this.invokeTranslate(
            text,
            language,
            path.join(this.basePath, 'comm'),
            'comm'
          )
        );
      }
    }
    await Promise.all(translatePromises);
    this.createLockFile('comm');
  }

  /**
   * 通用訊息翻譯
   * @param text 文本
   * @returns 翻譯後的文本物件,包含各語言的翻譯
   */
  comm(text: string) {
    const translations = {};
    for (const lang of this.config.languages) {
      const langFile = path.join(this.basePath, 'comm', `${lang}.json`);
      if (fs.existsSync(langFile)) {
        const content = JSON.parse(fs.readFileSync(langFile, 'utf-8'));
        translations[lang] = content[text] || text;
      }
    }
    return translations;
  }

  /**
   * 呼叫翻譯
   * @param text 文本
   * @param language 語言
   * @param dirPath 目錄
   * @param type 型別
   * @returns
   */
  async invokeTranslate(
    text: string,
    language: string,
    dirPath: string,
    type: 'menu' | 'msg' | 'dict' | 'comm' = 'msg'
  ) {
    this.logger.debug(`${type} ${language} translate start`);
    const response = await axios.post(I18N.DEFAULT_SERVICE_URL, {
      label: 'i18n-node',
      params: {
        text,
        language,
      },
      stream: false,
    });
    const file = path.join(dirPath, `${language}.json`);
    fs.writeFileSync(file, response.data.data.result.data);
    this.logger.debug(`${type} ${language} translate success`);
  }
}
