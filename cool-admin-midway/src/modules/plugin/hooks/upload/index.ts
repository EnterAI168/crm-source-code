import { BaseUpload, MODETYPE } from './interface';
import { BasePluginHook } from '../base';
import * as fs from 'fs';
import * as path from 'path';
import * as moment from 'moment';
import { v1 as uuid } from 'uuid';
import { CoolCommException } from '@cool-midway/core';
import * as _ from 'lodash';
import { pUploadPath } from '../../../../comm/path';

/**
 * 檔案上傳
 */
export class CoolPlugin extends BasePluginHook implements BaseUpload {
  /**
   * 驗證路徑安全性，防止路徑遍歷攻擊
   * @param userInput 使用者輸入的檔名或路徑
   * @returns 安全的檔名
   */
  private sanitizePath(userInput: string): string {
    if (!userInput) {
      return '';
    }
    // 檢查是否包含路徑遍歷字元
    if (
      userInput.includes('..') ||
      userInput.includes('./') ||
      userInput.includes('.\\') ||
      userInput.includes('\\') ||
      userInput.includes('//') ||
      userInput.includes('\0') ||
      /^[a-zA-Z]:/.test(userInput) || // Windows絕對路徑
      userInput.startsWith('/')
    ) {
      throw new CoolCommException('非法的檔案路徑');
    }
    // 規範化路徑後再次檢查
    const normalized = path.normalize(userInput);
    if (normalized.includes('..') || normalized.startsWith('/')) {
      throw new CoolCommException('非法的檔案路徑');
    }
    return normalized;
  }

  /**
   * 驗證最終路徑是否在允許的目錄內
   * @param targetPath 目標路徑
   * @param basePath 基礎路徑
   */
  private validateTargetPath(targetPath: string, basePath: string): void {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedBase = path.resolve(basePath);
    if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
      throw new CoolCommException('檔案路徑超出允許範圍');
    }
  }

  /**
   * 獲得上傳模式
   * @returns
   */
  async getMode() {
    return {
      mode: MODETYPE.LOCAL,
      type: MODETYPE.LOCAL,
    };
  }

  /**
   * 獲得原始操作物件
   * @returns
   */
  async getMetaFileObj() {
    return;
  }

  /**
   * 下載並上傳
   * @param url
   * @param fileName
   */
  async downAndUpload(url: string, fileName?: string) {
    const { domain } = this.pluginInfo.config;
    const basePath = pUploadPath();
    const dateDir = moment().format('YYYYMMDD');

    // 從url獲取副檔名
    const extend = path.extname(fileName ? fileName : url);

    // 驗證檔名安全性
    let safeFileName: string;
    if (fileName) {
      safeFileName = this.sanitizePath(fileName);
      // 只取檔名部分，去除可能的子目錄
      safeFileName = path.basename(safeFileName);
    } else {
      safeFileName = uuid() + extend;
    }

    const download = require('download');
    // 資料
    const data = url.includes('http')
      ? await download(url)
      : fs.readFileSync(url);

    // 建立資料夾
    const dirPath = path.join(basePath, dateDir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const targetPath = path.join(dirPath, safeFileName);
    // 驗證最終路徑
    this.validateTargetPath(targetPath, basePath);

    fs.writeFileSync(targetPath, data);
    return `${domain}/upload/${dateDir}/${safeFileName}`;
  }

  /**
   * 指定Key(路徑)上傳，本地檔案上傳到儲存服務
   * @param filePath 檔案路徑
   * @param key 路徑一致會覆蓋原始檔
   */
  async uploadWithKey(filePath: any, key: any) {
    const { domain } = this.pluginInfo.config;
    const basePath = pUploadPath();
    const dateDir = moment().format('YYYYMMDD');

    // 驗證key安全性
    const safeKey = this.sanitizePath(key);

    const data = fs.readFileSync(filePath);

    // 構建目標路徑
    const targetPath = path.join(basePath, dateDir, safeKey);
    const dirPath = path.dirname(targetPath);

    // 驗證最終路徑
    this.validateTargetPath(targetPath, basePath);

    // 如果資料夾不存在則建立
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(targetPath, data);
    return `${domain}/upload/${dateDir}/${safeKey}`;
  }

  /**
   * 上傳檔案
   * @param ctx
   * @param key 檔案路徑
   */
  async upload(ctx: any) {
    const { domain } = this.pluginInfo.config;
    try {
      const { key } = ctx.fields;
      const basePath = pUploadPath();
      const dateDir = moment().format('YYYYMMDD');

      // 驗證key安全性
      let safeKey: string | undefined;
      if (key) {
        safeKey = this.sanitizePath(key);
      }

      if (_.isEmpty(ctx.files)) {
        throw new CoolCommException('上傳檔案為空');
      }

      const file = ctx.files[0];
      // 安全處理原始檔名
      const originalFileName = path.basename(file.filename);
      const extension = originalFileName.split('.').pop();

      const finalName = safeKey || `${uuid()}.${extension}`;
      const name = `${dateDir}/${finalName}`;
      const target = path.join(basePath, name);

      // 驗證最終路徑
      this.validateTargetPath(target, basePath);

      const dirPath = path.join(basePath, dateDir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const data = fs.readFileSync(file.data);
      fs.writeFileSync(target, data);
      return domain + '/upload/' + name;
    } catch (err) {
      console.error(err);
      if (err instanceof CoolCommException) {
        throw err;
      }
      throw new CoolCommException('上傳失敗: ' + err.message);
    }
  }
}

// 匯出外掛例項， Plugin名稱不可修改
export const Plugin = CoolPlugin;
