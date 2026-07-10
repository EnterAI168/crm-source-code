import { App, IMidwayApplication, Scope, ScopeEnum } from '@midwayjs/core';
import { ALL, Config, Inject, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseSysMenuEntity } from '../../entity/sys/menu';
import * as _ from 'lodash';
import { BaseSysPermsService } from './perms';
import { Context } from '@midwayjs/koa';
import { TempDataSource } from './data';
// eslint-disable-next-line node/no-unpublished-import
import * as ts from 'typescript';
import * as fs from 'fs';
import * as pathUtil from 'path';
import { BaseSysRoleMenuEntity } from '../../entity/sys/role_menu';
import { BaseSysUserRoleEntity } from '../../entity/sys/user_role';

/**
 * 選單
 */
@Scope(ScopeEnum.Request, { allowDowngrade: true })
@Provide()
export class BaseSysMenuService extends BaseService {
  @Inject()
  ctx: Context;

  @InjectEntityModel(BaseSysMenuEntity)
  baseSysMenuEntity: Repository<BaseSysMenuEntity>;

  @InjectEntityModel(BaseSysRoleMenuEntity)
  baseSysRoleMenuEntity: Repository<BaseSysRoleMenuEntity>;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  @Config(ALL)
  config;

  @App()
  app: IMidwayApplication;

  /**
   * 獲得所有選單
   */
  async list() {
    const isAdmin = await this.baseSysPermsService.isAdmin(
      this.ctx.admin.roleIds || []
    );
    const menus = await this.getMenus(
      this.ctx.admin.roleIds,
      isAdmin
    );
    if (!_.isEmpty(menus)) {
      menus.forEach((e: any) => {
        const parentMenu = menus.filter(m => {
          e.parentId = parseInt(e.parentId);
          if (e.parentId == m.id) {
            return m.name;
          }
        });
        if (!_.isEmpty(parentMenu)) {
          e.parentName = parentMenu[0].name;
        }
      });
    }
    return menus;
  }

  /**
   * 修改之後
   * @param param
   */
  async modifyAfter(param) {
    if (param.id) {
      await this.refreshPerms(param.id);
    }
  }

  /**
   * 根據角色獲得權限資訊
   * @param {[]} roleIds 陣列
   */
  async getPerms(roleIds, isAdmin = false) {
    let perms = [];
    if (!_.isEmpty(roleIds)) {
      const find = await this.baseSysMenuEntity.createQueryBuilder('a');
      if (!isAdmin) {
        find.innerJoinAndSelect(
          BaseSysRoleMenuEntity,
          'b',
          'a.id = b.menuId AND b.roleId in (:...roleIds)',
          { roleIds }
        );
      }
      find.where('a.perms is not NULL');
      const result = await find.getMany();
      if (result) {
        result.forEach(d => {
          if (d.perms) {
            perms = perms.concat(d.perms.split(','));
          }
        });
      }
      perms = _.uniq(perms);
      perms = _.remove(perms, n => {
        return !_.isEmpty(n);
      });
    }
    return _.uniq(perms);
  }

  /**
   * 獲得使用者選單資訊
   * @param roleIds
   * @param isAdmin 是否是超管
   */
  async getMenus(roleIds, isAdmin) {
    const find = this.baseSysMenuEntity.createQueryBuilder('a');
    if (!isAdmin) {
      find.innerJoinAndSelect(
        BaseSysRoleMenuEntity,
        'b',
        'a.id = b.menuId AND b.roleId in (:...roleIds)',
        { roleIds }
      );
    }
    find.orderBy('a.orderNum', 'ASC');
    const list = await find.getMany();
    return this.filterEmptyDirectoryMenus(_.uniqBy(list, 'id'));
  }

  /**
   * 過濾只有父級被授權、但沒有任何子選單/按鈕授權的空目錄。
   * 角色樹會儲存半選父級用於掛載子選單；如果歷史資料只剩父級，會導致側邊欄顯示空主選單。
   */
  private filterEmptyDirectoryMenus(list: BaseSysMenuEntity[]) {
    const selectedIds = new Set(list.map(item => Number(item.id)));

    return list.filter(item => {
      if (Number(item.type) !== 0) {
        return true;
      }

      return list.some(child => {
        if (Number(child.id) === Number(item.id)) {
          return false;
        }
        return this.hasSelectedAncestor(child, Number(item.id), selectedIds, list);
      });
    });
  }

  private hasSelectedAncestor(
    menu: BaseSysMenuEntity,
    ancestorId: number,
    selectedIds: Set<number>,
    list: BaseSysMenuEntity[]
  ) {
    let parentId = Number(menu.parentId || 0);

    while (parentId) {
      if (parentId === ancestorId) {
        return true;
      }

      if (!selectedIds.has(parentId)) {
        return false;
      }

      const parent = list.find(item => Number(item.id) === parentId);
      parentId = Number(parent?.parentId || 0);
    }

    return false;
  }

  /**
   * 刪除
   * @param ids
   */
  async delete(ids) {
    let idArr;
    if (ids instanceof Array) {
      idArr = ids;
    } else {
      idArr = ids.split(',');
    }
    for (const id of idArr) {
      await this.baseSysMenuEntity.delete({ id });
      await this.delChildMenu(id);
    }
  }

  /**
   * 刪除子選單
   * @param id
   */
  private async delChildMenu(id) {
    await this.refreshPerms(id);
    const delMenu = await this.baseSysMenuEntity.findBy({ parentId: id });
    if (_.isEmpty(delMenu)) {
      return;
    }
    const delMenuIds = delMenu.map(e => {
      return e.id;
    });
    await this.baseSysMenuEntity.delete(delMenuIds);
    for (const menuId of delMenuIds) {
      await this.delChildMenu(menuId);
    }
  }

  /**
   * 更新權限
   * @param menuId
   */
  async refreshPerms(menuId) {
    const find = this.baseSysRoleMenuEntity.createQueryBuilder('a');
    find.leftJoinAndSelect(BaseSysUserRoleEntity, 'b', 'a.roleId = b.roleId');
    find.where('a.menuId = :menuId', { menuId: menuId });
    find.select('b.userId', 'userId');
    const users = await find.getRawMany();
    // 重新整理admin權限
    await this.baseSysPermsService.refreshPerms(1);
    if (!_.isEmpty(users)) {
      // 重新整理其他權限
      for (const user of _.uniqBy(users, 'userId')) {
        await this.baseSysPermsService.refreshPerms(user.userId);
      }
    }
  }

  /**
   * 解析實體和Controller
   * @param entityString
   * @param controller
   * @param module
   */
  async parse(entityString: string, controller: string, module: string) {
    const tempDataSource = new TempDataSource({
      ...this.config.typeorm.dataSource.default,
      entities: [],
    });
    // 連線資料庫
    await tempDataSource.initialize();
    const { newCode, className, oldTableName } = this.parseCode(entityString);
    const code = ts.transpile(
      `${newCode}
        tempDataSource.options.entities.push(${className})
        `,
      {
        emitDecoratorMetadata: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2018,
        removeComments: true,
        experimentalDecorators: true,
        noImplicitThis: true,
        noUnusedLocals: true,
        stripInternal: true,
        skipLibCheck: true,
        pretty: true,
        declaration: true,
        noImplicitAny: false,
      }
    );
    eval(code);
    await tempDataSource.buildMetadatas();
    const meta = tempDataSource.getMetadata(className);
    const columnArr = meta.columns;
    await tempDataSource.destroy();

    const commColums = [];
    const columns = _.filter(
      columnArr.map(e => {
        return {
          propertyName: e.propertyName,
          type: typeof e.type == 'string' ? e.type : e.type.name.toLowerCase(),
          length: e.length,
          comment: e.comment,
          nullable: e.isNullable,
        };
      }),
      o => {
        if (['createTime', 'updateTime'].includes(o.propertyName)) {
          commColums.push(o);
        }
        return o && !['createTime', 'updateTime'].includes(o.propertyName);
      }
    ).concat(commColums);
    if (!controller) {
      const tableNames = oldTableName.split('_');
      const fileName = tableNames[tableNames.length - 1];
      return {
        columns,
        className: className.replace('TEMP', ''),
        tableName: oldTableName,
        fileName,
        path: `/admin/${module}/${fileName}`,
      };
    }
    const fileName = await this.fileName(controller);
    return {
      columns,
      path: `/admin/${module}/${fileName}`,
    };
  }

  /**
   * 解析Entity類名
   * @param code
   * @returns
   */
  parseCode(code: string) {
    try {
      const oldClassName = code
        .match('class(.*)extends')[1]
        .replace(/\s*/g, '');
      const oldTableStart = code.indexOf('@Entity(');
      const oldTableEnd = code.indexOf(')');

      const oldTableName = code
        .substring(oldTableStart + 9, oldTableEnd - 1)
        .replace(/\s*/g, '')
        // eslint-disable-next-line no-useless-escape
        .replace(/\"/g, '')
        // eslint-disable-next-line no-useless-escape
        .replace(/\'/g, '');
      const className = `${oldClassName}TEMP`;
      return {
        newCode: code
          .replace(oldClassName, className)
          .replace(oldTableName, `func_${oldTableName}`),
        className,
        tableName: `func_${oldTableName}`,
        oldTableName,
      };
    } catch (err) {
      throw new CoolCommException('程式碼結構不正確，請檢查');
    }
  }

  /**
   *  建立程式碼
   * @param body body
   */
  async create(body) {
    const { module, entity, controller, service, fileName } = body;
    const basePath = this.app.getBaseDir();
    const modulePath = pathUtil.join(basePath, '..', 'src', 'modules', module);
    // 生成Entity
    const entityPath = pathUtil.join(modulePath, 'entity', `${fileName}.ts`);
    // 生成Controller
    const controllerPath = pathUtil.join(
      modulePath,
      'controller',
      'admin',
      `${fileName}.ts`
    );
    // 生成Service
    const servicePath = pathUtil.join(modulePath, 'service', `${fileName}.ts`);
    this.createConfigFile(module);
    this.createFile(entityPath, entity);
    this.createFile(controllerPath, controller);
    this.createFile(servicePath, service);
  }

  /**
   * 建立配置檔案
   * @param module
   */
  async createConfigFile(module: string) {
    const basePath = this.app.getBaseDir();
    const configFilePath = pathUtil.join(
      basePath,
      '..',
      'src',
      'modules',
      module,
      'config.ts'
    );
    if (!fs.existsSync(configFilePath)) {
      const data = `import { ModuleConfig } from '@cool-midway/core';

/**
 * 模組配置
 */
export default () => {
  return {
    // 模組名稱
    name: 'xxx',
    // 模組描述
    description: 'xxx',
    // 中介軟體，只對本模組有效
    middlewares: [],
    // 中介軟體，全域有效
    globalMiddlewares: [],
    // 模組載入順序，預設為0，值越大越優先載入
    order: 0,
  } as ModuleConfig;
};
`;
      await this.createFile(configFilePath, data);
    }
  }

  /**
   * 找到檔名
   * @param controller
   * @returns
   */
  async fileName(controller: string) {
    const regex = /import\s*{\s*\w+\s*}\s*from\s*'[^']*\/([\w-]+)';/;
    const match = regex.exec(controller);

    if (match && match.length > 1) {
      return match[1];
    }

    return null;
  }

  /**
   * 建立檔案
   * @param filePath
   * @param content
   */
  async createFile(filePath: string, content: string) {
    const folderPath = pathUtil.dirname(filePath);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
  }

  /**
   * 匯出選單
   * @param ids
   * @returns
   */
  async export(ids: number[]) {
    const result: any[] = [];
    const menus = await this.baseSysMenuEntity.findBy({ id: In(ids) });

    // 遞迴取出子選單
    const getChildMenus = (parentId: number): any[] => {
      const children = _.remove(menus, e => e.parentId == parentId);
      children.forEach(child => {
        child.childMenus = getChildMenus(child.id);
        // 刪除不需要的欄位
        delete child.id;
        delete child.createTime;
        delete child.updateTime;
        delete child.parentId;
      });
      return children;
    };

    // lodash取出父級選單(parentId為 null)， 並從menus 刪除
    const parentMenus = _.remove(menus, e => {
      return e.parentId == null;
    });

    // 對於每個父級選單，取得它的子選單
    parentMenus.forEach(parent => {
      parent.childMenus = getChildMenus(parent.id);
      // 刪除不需要的欄位
      delete parent.id;
      delete parent.createTime;
      delete parent.updateTime;
      delete parent.parentId;

      result.push(parent);
    });

    return result;
  }

  /**
   * 匯入
   * @param menus
   */
  async import(menus: any[]) {
    // 遞迴儲存子選單
    const saveChildMenus = async (parentMenu: any, parentId: number | null) => {
      const children = parentMenu.childMenus || [];
      for (let child of children) {
        const childData = { ...child, parentId: parentId }; // 保持與資料庫的parentId欄位的一致性
        delete childData.childMenus; // 刪除childMenus屬性，因為我們不想將它儲存到資料庫中

        // 儲存子選單並取得其ID，以便為其子選單設定parentId
        const savedChild = await this.baseSysMenuEntity.save(childData);

        if (!_.isEmpty(child.childMenus)) {
          await saveChildMenus(child, savedChild.id);
        }
      }
    };

    for (let menu of menus) {
      const menuData = { ...menu };
      delete menuData.childMenus; // 刪除childMenus屬性，因為我們不想將它儲存到資料庫中

      // 儲存主選單並取得其ID
      const savedMenu = await this.baseSysMenuEntity.save(menuData);

      if (menu.childMenus && menu.childMenus.length > 0) {
        await saveChildMenus(menu, savedMenu.id);
      }
    }
  }
}
