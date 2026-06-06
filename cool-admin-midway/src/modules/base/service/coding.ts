import { App, IMidwayApplication, Init, Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ai編碼
 */
@Provide()
export class BaseCodingService extends BaseService {
  @App()
  app: IMidwayApplication;

  /**
   * 獲得模組目錄結構
   */
  async getModuleTree() {
    if (this.app.getEnv() !== 'local') {
      return [];
    }

    const moduleDir = await this.app.getBaseDir();
    const modulesPath = path.join(moduleDir, 'modules');
    // 返回modules下有多少個模組
    const modules = fs.readdirSync(modulesPath);
    return modules.filter(module => module !== '.DS_Store');
  }

  /**
   * 建立程式碼
   * @param codes 程式碼
   */
  async createCode(
    codes: {
      path: string;
      content: string;
    }[]
  ) {
    if (this.app.getEnv() !== 'local') {
      throw new Error('只能在開發環境下建立程式碼');
    }

    const moduleDir = this.app.getAppDir();

    for (const code of codes) {
      // 格式化程式碼內容
      const formattedContent = await this.formatContent(code.content);

      // 獲取完整的檔案路徑
      const filePath = path.join(moduleDir, code.path);

      // 確保目錄存在
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // 寫入檔案
      fs.writeFileSync(filePath, formattedContent, 'utf8');
    }
  }

  /**
   * 格式化內容
   * @param content
   */
  async formatContent(content: string) {
    // 使用prettier格式化內容
    const prettier = require('prettier');
    return prettier.format(content, {
      parser: 'typescript',
      singleQuote: true,
      trailingComma: 'all',
      bracketSpacing: true,
      arrowParens: 'avoid',
      printWidth: 80,
    });
  }
}
