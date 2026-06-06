// 模式
export enum MODETYPE {
  // 本地
  LOCAL = 'local',
  // 雲端儲存
  CLOUD = 'cloud',
  // 其他
  OTHER = 'other',
}

/**
 * 上傳模式
 */
export interface Mode {
  // 模式
  mode: MODETYPE;
  // 型別
  type: string;
}

/**
 * 檔案上傳
 */
export interface BaseUpload {
  /**
   * 獲得上傳模式
   */
  getMode(): Promise<Mode>;

  /**
   * 獲得原始操作物件
   * @returns
   */
  getMetaFileObj(): Promise<any>;

  /**
   * 下載並上傳
   * @param url
   * @param fileName 檔名
   */
  downAndUpload(url: string, fileName?: string): Promise<string>;

  /**
   * 指定Key(路徑)上傳，本地檔案上傳到儲存服務
   * @param filePath 檔案路徑
   * @param key 路徑一致會覆蓋原始檔
   */
  uploadWithKey(filePath, key): Promise<string>;

  /**
   * 上傳檔案
   * @param ctx
   * @param key 檔案路徑
   */
  upload(ctx): Promise<string>;
}
