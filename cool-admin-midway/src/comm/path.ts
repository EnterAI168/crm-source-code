import * as path from 'path';
import * as os from 'os';
import * as md5 from 'md5';
import * as fs from 'fs';

/**
 * 獲得配置檔案中的 keys
 * @returns
 */
const getKeys = () => {
  const configFile = path.join(__dirname, '../config/config.default.js');
  const configContent = fs.readFileSync(configFile, 'utf8');
  const keys = configContent.match(/keys: '([^']+)'/)?.[1];
  return keys;
};

/**
 * 專案資料目錄
 * @returns
 */
export const pDataPath = () => {
  const dirPath = path.join(os.homedir(), '.cool-admin', md5(getKeys()));
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

/**
 * 上傳目錄
 * @returns
 */
export const pUploadPath = () => {
  const uploadPath = path.join(pDataPath(), 'upload');
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return uploadPath;
};

/**
 * 外掛目錄
 * @returns
 */
export const pPluginPath = () => {
  const pluginPath = path.join(pDataPath(), 'plugin');
  if (!fs.existsSync(pluginPath)) {
    fs.mkdirSync(pluginPath, { recursive: true });
  }
  return pluginPath;
};

/**
 * sqlite 資料庫檔案
 */
export const pSqlitePath = () => {
  return path.join(pDataPath(), 'cool.sqlite');
};

/**
 * 快取目錄
 * @returns
 */
export const pCachePath = () => {
  return path.join(pDataPath(), 'cache');
};
