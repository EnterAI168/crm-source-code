import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { BaseSysRoleEntity } from '../../entity/sys/role';
import { BaseSysUserRoleEntity } from '../../entity/sys/user_role';
import * as _ from 'lodash';
import { BaseSysRoleMenuEntity } from '../../entity/sys/role_menu';
import { BaseSysRoleDepartmentEntity } from '../../entity/sys/role_department';
import { BaseSysMenuEntity } from '../../entity/sys/menu';
import { BaseSysPermsService } from './perms';

/**
 * 角色
 */
@Provide()
export class BaseSysRoleService extends BaseService {
  private readonly INTERNAL_ROLE_LABEL = 'office_clerk';

  private readonly INTERNAL_MANAGER_ROLE_LABEL = 'office_clerk_manager';

  @InjectEntityModel(BaseSysRoleEntity)
  baseSysRoleEntity: Repository<BaseSysRoleEntity>;

  @InjectEntityModel(BaseSysUserRoleEntity)
  baseSysUserRoleEntity: Repository<BaseSysUserRoleEntity>;

  @InjectEntityModel(BaseSysRoleMenuEntity)
  baseSysRoleMenuEntity: Repository<BaseSysRoleMenuEntity>;

  @InjectEntityModel(BaseSysMenuEntity)
  baseSysMenuEntity: Repository<BaseSysMenuEntity>;

  @InjectEntityModel(BaseSysRoleDepartmentEntity)
  baseSysRoleDepartmentEntity: Repository<BaseSysRoleDepartmentEntity>;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  @Inject()
  ctx;

  /**
   * 根據使用者ID獲得所有使用者角色
   * @param userId
   */
  async getByUser(userId: number): Promise<number[]> {
    const userRole = await this.baseSysUserRoleEntity.findBy({ userId });
    if (!_.isEmpty(userRole)) {
      return userRole.map(e => {
        return e.roleId;
      });
    }
    return [];
  }

  /**
   *
   * @param param
   */
  async modifyAfter(param) {
    if (param.id) {
      this.updatePerms(param.id, param.menuIdList, param.departmentIdList);
    }
  }

  /**
   * 更新權限
   * @param roleId
   * @param menuIdList
   * @param departmentIds
   */
  async updatePerms(roleId, menuIdList?, departmentIds = []) {
    const normalizedMenuIds = await this.normalizeMenuIds(menuIdList || []);

    // 更新選單權限
    await this.baseSysRoleMenuEntity.delete({ roleId });
    await Promise.all(
      normalizedMenuIds.map(async e => {
        return await this.baseSysRoleMenuEntity.save({ roleId, menuId: e });
      })
    );
    // 更新部門權限
    await this.baseSysRoleDepartmentEntity.delete({ roleId });
    await Promise.all(
      departmentIds.map(async e => {
        return await this.baseSysRoleDepartmentEntity.save({
          roleId,
          departmentId: e,
        });
      })
    );
    // 重新整理權限
    const userRoles = await this.baseSysUserRoleEntity.findBy({ roleId });
    for (const userRole of userRoles) {
      await this.baseSysPermsService.refreshPerms(userRole.userId);
    }
  }

  private async normalizeMenuIds(menuIdList: number[]) {
    const ids = _.uniq(
      (Array.isArray(menuIdList) ? menuIdList : [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0)
    );

    if (_.isEmpty(ids)) {
      return [];
    }

    const menus = await this.baseSysMenuEntity.find();
    const menuMap = new Map(menus.map(item => [Number(item.id), item]));
    const normalized = new Set<number>();

    ids.forEach(id => {
      const menu = menuMap.get(id);
      if (!menu || Number(menu.type) === 0) {
        return;
      }

      normalized.add(id);
      let parentId = Number(menu.parentId || 0);
      while (parentId) {
        const parent = menuMap.get(parentId);
        if (!parent) {
          break;
        }
        normalized.add(parentId);
        parentId = Number(parent.parentId || 0);
      }
    });

    return [...normalized];
  }

  /**
   * 角色資訊
   * @param id
   */
  async info(id) {
    const info = await this.baseSysRoleEntity.findOneBy({ id });
    if (info) {
      const menus = await this.baseSysRoleMenuEntity.findBy(
        id !== 1 ? { roleId: id } : {}
      );
      const menuIdList = menus.map(e => {
        return parseInt(e.menuId + '');
      });
      const departments = await this.baseSysRoleDepartmentEntity.findBy(
        id !== 1 ? { roleId: id } : {}
      );
      const departmentIdList = departments.map(e => {
        return parseInt(e.departmentId + '');
      });
      return {
        ...info,
        menuIdList,
        departmentIdList,
      };
    }
    return {};
  }

  async list() {
    const roleIds: number[] = this.ctx.admin.roleIds || [];
    const scopedRoleIds = roleIds.length ? roleIds : [null];
    const isAdmin = await this.baseSysPermsService.isAdmin(
      roleIds
    );
    const currentRoles = !_.isEmpty(roleIds)
      ? await this.baseSysRoleEntity.findBy({ id: In(roleIds) })
      : [];
    const isOfficeClerkManager = currentRoles.some(
      role => role.label === this.INTERNAL_MANAGER_ROLE_LABEL
    );
    return this.baseSysRoleEntity
      .createQueryBuilder('a')
      .where(
        new Brackets(qb => {
          qb.where('a.id !=:id', { id: 1 }); // 超級管理員的角色不展示
          // 如果不是超管，只能看到自己新建的或者自己有的角色
          if (!isAdmin && isOfficeClerkManager) {
            qb.andWhere(
              '(a.userId=:userId or a.id in (:...roleId) or a.label in (:...officeRoleLabels))',
              {
                userId: this.ctx.admin.userId,
                roleId: scopedRoleIds,
                officeRoleLabels: [
                  this.INTERNAL_ROLE_LABEL,
                  this.INTERNAL_MANAGER_ROLE_LABEL,
                ],
              }
            );
          } else if (!isAdmin) {
            qb.andWhere('(a.userId=:userId or a.id in (:...roleId))', {
              userId: this.ctx.admin.userId,
              roleId: scopedRoleIds,
            });
          }
        })
      )
      .getMany();
  }
}
