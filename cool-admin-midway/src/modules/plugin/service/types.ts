import { BaseService } from '@cool-midway/core';
import { App, IMidwayApplication, Inject, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import * as ts from 'typescript';
import { Utils } from '../../../comm/utils';
import { PluginInfoEntity } from '../entity/info';
import { PluginService } from './info';

/**
 * 外掛型別服務
 */
@Provide()
export class PluginTypesService extends BaseService {
  @App()
  app: IMidwayApplication;

  @InjectEntityModel(PluginInfoEntity)
  pluginInfoEntity: Repository<PluginInfoEntity>;

  @Inject()
  pluginService: PluginService;

  @Inject()
  utils: Utils;

  /**
   * 生成d.ts檔案
   * @param tsContent
   * @returns
   */
  async dtsContent(tsContent: string) {
    let output = '';

    const compilerHost: ts.CompilerHost = {
      fileExists: ts.sys.fileExists,
      getCanonicalFileName: ts.sys.useCaseSensitiveFileNames
        ? s => s
        : s => s.toLowerCase(),
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
      getDirectories: ts.sys.getDirectories,
      getNewLine: () => ts.sys.newLine,
      getSourceFile: (fileName, languageVersion) => {
        if (fileName === 'file.ts') {
          return ts.createSourceFile(
            fileName,
            tsContent,
            languageVersion,
            true
          );
        }
        const filePath = ts.sys.resolvePath(fileName);
        return ts.sys.readFile(filePath)
          ? ts.createSourceFile(
              filePath,
              ts.sys.readFile(filePath)!,
              languageVersion,
              true
            )
          : undefined;
      },
      readFile: ts.sys.readFile,
      useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
      writeFile: (fileName, content) => {
        if (fileName.includes('file.d.ts')) {
          output = content || output;
        }
      },
    };

    const options: ts.CompilerOptions = {
      declaration: true,
      emitDeclarationOnly: true,
      outDir: './',
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      noEmitOnError: false,
      target: ts.ScriptTarget.ES2018,
      strict: false,
      module: ts.ModuleKind.Node16,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      types: ['node'],
    };

    const program = ts.createProgram(['file.ts'], options, compilerHost);
    program.emit();

    if (!output) {
      // Provide a default value if the output is still empty
      output = '/* No declaration content generated */';
    }
    return output;
  }

  /**
   * 生成d.ts檔案
   * @param key
   * @param tsContent
   * @returns
   */
  async generateDtsFile(key: string, tsContent: string) {
    const env = this.app.getEnv();
    // 不是本地開發環境不生成d.ts檔案
    if (env != 'local' || !tsContent) {
      return;
    }
    // 基礎路徑
    const basePath = path.join(this.app.getBaseDir(), '..', 'typings');
    // pluginDts檔案路徑
    const pluginDtsPath = path.join(basePath, 'plugin.d.ts');
    // plugin資料夾路徑
    const pluginPath = path.join(basePath, `${key}.d.ts`);
    // 生成d.ts檔案
    const dtsContent = await this.dtsContent(tsContent);

    // 讀取plugin.d.ts檔案內容
    let pluginDtsContent = fs.readFileSync(pluginDtsPath, 'utf-8');

    // 根據key判斷是否在PluginMap中存在
    const keyWithHyphen = key.includes('-');
    const importStatement = keyWithHyphen
      ? `import * as ${key.replace(/-/g, '_')} from './${key}';`
      : `import * as ${key} from './${key}';`;
    const pluginMapEntry = keyWithHyphen
      ? `'${key}': ${key.replace(/-/g, '_')}.CoolPlugin;`
      : `${key}: ${key}.CoolPlugin;`;

    // 檢查import語句是否已經存在，若不存在則新增
    if (!pluginDtsContent.includes(importStatement)) {
      pluginDtsContent = `${importStatement}\n${pluginDtsContent}`;
    }

    // 檢查PluginMap中的鍵是否存在，若不存在則新增
    if (pluginDtsContent.includes(pluginMapEntry)) {
      // 鍵存在則覆蓋
      const regex = new RegExp(
        `(\\s*${keyWithHyphen ? `'${key}'` : key}:\\s*[^;]+;)`
      );
      pluginDtsContent = pluginDtsContent.replace(regex, pluginMapEntry);
    } else {
      // 鍵不存在則追加
      const pluginMapRegex = /interface\s+PluginMap\s*{([^}]*)}/;
      pluginDtsContent = pluginDtsContent.replace(
        pluginMapRegex,
        (match, p1) => {
          return match.replace(p1, `${p1.trim()}\n  ${pluginMapEntry}`);
        }
      );
    }

    // 格式化內容
    pluginDtsContent = await this.formatContent(pluginDtsContent);

    // 延遲2秒寫入檔案
    setTimeout(async () => {
      // 寫入d.ts檔案，如果存在則覆蓋
      fs.writeFile(pluginPath, await this.formatContent(dtsContent), () => {});

      // 寫入plugin.d.ts檔案
      fs.writeFile(pluginDtsPath, pluginDtsContent, () => {});
    }, 2000);
  }

  /**
   * 刪除d.ts檔案中的指定key
   * @param key
   */
  async deleteDtsFile(key: string) {
    const env = this.app.getEnv();
    // 不是本地開發環境不刪除d.ts檔案
    if (env != 'local') {
      return;
    }
    // 基礎路徑
    const basePath = path.join(this.app.getBaseDir(), '..', 'typings');
    // pluginDts檔案路徑
    const pluginDtsPath = path.join(basePath, 'plugin.d.ts');
    // plugin資料夾路徑
    const pluginPath = path.join(basePath, `${key}.d.ts`);

    // 讀取plugin.d.ts檔案內容
    let pluginDtsContent = fs.readFileSync(pluginDtsPath, 'utf-8');

    // 根據key判斷是否在PluginMap中存在
    const keyWithHyphen = key.includes('-');
    const importStatement = keyWithHyphen
      ? `import \\* as ${key.replace(/-/g, '_')} from '\\./${key}';`
      : `import \\* as ${key} from '\\./${key}';`;
    const pluginMapEntry = keyWithHyphen
      ? `'${key}': ${key.replace(/-/g, '_')}.CoolPlugin;`
      : `${key}: ${key}.CoolPlugin;`;

    // 刪除import語句
    const importRegex = new RegExp(`${importStatement}\\n`, 'g');
    pluginDtsContent = pluginDtsContent.replace(importRegex, '');

    // 刪除PluginMap中的鍵
    const pluginMapRegex = new RegExp(`\\s*${pluginMapEntry}`, 'g');
    pluginDtsContent = pluginDtsContent.replace(pluginMapRegex, '');

    // 格式化內容
    pluginDtsContent = await this.formatContent(pluginDtsContent);

    // 延遲2秒寫入檔案
    setTimeout(async () => {
      // 刪除外掛d.ts檔案
      if (fs.existsSync(pluginPath)) {
        fs.unlink(pluginPath, () => {});
      }
      // 寫入plugin.d.ts檔案
      fs.writeFile(pluginDtsPath, pluginDtsContent, () => {});
    }, 2000);
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

  /**
   * 重新生成d.ts檔案
   */
  async reGenerate() {
    const pluginInfos = await this.pluginInfoEntity
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 1 })
      .select(['a.id', 'a.status', 'a.tsContent', 'a.keyName'])
      .getMany();
    for (const pluginInfo of pluginInfos) {
      const data = await this.pluginService.getData(pluginInfo.keyName);
      if (!data) {
        continue;
      }
      const tsContent = data.tsContent?.data;
      if (tsContent) {
        await this.generateDtsFile(pluginInfo.keyName, tsContent);
        await this.utils.sleep(200);
      }
    }
  }
}
