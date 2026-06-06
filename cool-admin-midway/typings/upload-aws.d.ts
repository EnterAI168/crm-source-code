import {
  BasePlugin,
  BaseUpload,
  Mode,
  PluginInfo,
} from '@cool-midway/plugin-cli';
import { S3Client } from '@aws-sdk/client-s3';
/**
 * 亞馬遜雲檔案上傳
 */
export declare class CoolPlugin extends BasePlugin implements BaseUpload {
  client: S3Client;
  /**
   * 初始化
   * @param pluginInfo
   */
  init(pluginInfo: PluginInfo): Promise<void>;
  /**
   * 獲得上傳模式
   */
  getMode(): Promise<Mode>;
  /**
   * 獲得原始操作物件
   * @returns
   */
  getMetaFileObj(): S3Client;
  /**
   * 根據給定的 URL 下載檔案並返回一個 Buffer。
   * @param {string} url 檔案的 URL
   * @return {Promise<Buffer>} 返回一個 Promise，解析為檔案內容的 Buffer
   */
  downloadFileAsBuffer(url: any): Promise<Buffer<any>>;
  /**
   * 下載並上傳
   * @param url
   * @param fileName 檔名
   */
  downAndUpload(url: string, fileName?: string): Promise<string>;
  /**
   * 指定Key(路徑)上傳
   * @param filePath 檔案路徑
   * @param key 路徑一致會覆蓋原始檔
   */
  uploadWithKey(filePath: any, key: any): Promise<string>;
  /**
   * 獲得簽名
   * @param ctx
   * @returns
   */
  upload(ctx?: any): Promise<any>;
}
export declare const Plugin: typeof CoolPlugin;
