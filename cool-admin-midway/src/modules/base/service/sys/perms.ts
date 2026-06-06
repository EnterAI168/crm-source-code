import { Inject, InjectClient, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { BaseSysMenuService } from './menu';
import { BaseSysRoleService } from './role';
import { BaseSysDepartmentService } from './department';
import { Context } from '@midwayjs/koa';
import { CachingFactory, MidwayCache } from '@midwayjs/cache-manager';
import { BaseSysRoleEntity } from '../../entity/sys/role';
import { In, Repository } from 'typeorm';
import { InjectEntityModel } from '@midwayjs/typeorm';

/**
 * 權限
 */
@Provide()
export class BaseSysPermsService extends BaseService {
  private readonly SUPER_ADMIN_LABELS = ['admin', 'boss'];
  private readonly ADMIN_LABEL = 'admin';

  @InjectClient(CachingFactory, 'default')
  midwayCache: MidwayCache;

  @Inject()
  baseSysMenuService: BaseSysMenuService;

  @Inject()
  baseSysRoleService: BaseSysRoleService;

  @Inject()
  baseSysDepartmentService: BaseSysDepartmentService;

  @InjectEntityModel(BaseSysRoleEntity)
  baseSysRoleEntity: Repository<BaseSysRoleEntity>;

  @Inject()
  ctx: Context;
  base: any;

  /**
   * 重新整理權限
   * @param userId 使用者ID
   */
  async refreshPerms(userId) {
    await this.rebuildPermsCache(userId);
  }

  /**
   * 重建權限快取
   * @param userId 使用者ID
   * @param clearToken 是否清除登入態
   */
  async rebuildPermsCache(userId, clearToken = true) {
    if (clearToken) {
      await this.midwayCache.del(`admin:token:${userId}`);
    }
    const roleIds = await this.baseSysRoleService.getByUser(userId);
    const isMenuAdmin = await this.isMenuAdmin(roleIds);
    const isAdmin = await this.isAdmin(roleIds);
    const perms = await this.baseSysMenuService.getPerms(roleIds, isMenuAdmin);
    await this.midwayCache.set(`admin:perms:${userId}`, perms);
    // 更新部門權限
    const departments = await this.baseSysDepartmentService.getByRoleIds(
      roleIds,
      isAdmin
    );
    await this.midwayCache.set(`admin:department:${userId}`, departments);
  }

  /**
   * 根據角色判斷是不是超管
   * @param roleIds
   */
  async isAdmin(roleIds: number[]) {
    const roleLabels = await this.getRoleLabels(roleIds);
    return roleLabels.some(label => this.SUPER_ADMIN_LABELS.includes(label));
  }

  /**
   * 獲得權限選單
   * @param roleIds
   */
  async permmenu(roleIds: number[]) {
    const isMenuAdmin = await this.isMenuAdmin(roleIds);
    const perms = await this.baseSysMenuService.getPerms(roleIds, isMenuAdmin);
    const menus = await this.baseSysMenuService.getMenus(roleIds, isMenuAdmin);
    return { perms, menus };
  }

  private async getRoleLabels(roleIds: number[]): Promise<string[]> {
    const roles = await this.baseSysRoleEntity.findBy({ id: In(roleIds) });
    return roles.map(item => item.label);
  }

  // 選單與按鈕權限僅 admin 走超管邏輯，boss 需要按角色勾選生效
  async isMenuAdmin(roleIds: number[]) {
    const roleLabels = await this.getRoleLabels(roleIds);
    return roleLabels.includes(this.ADMIN_LABEL);
  }

  /**
   * 根據使用者ID獲得部門權限
   * @param userId
   * @return 部門ID陣列
   */
  async departmentIds(userId: number) {
    const department: any = await this.midwayCache.get(
      `admin:department:${userId}`
    );
    if (department) {
      return department;
    } else {
      return [];
    }
  }
}
