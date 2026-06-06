import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { BaseSysDepartmentEntity } from '../../entity/sys/department';
import * as _ from 'lodash';
import { BaseSysRoleDepartmentEntity } from '../../entity/sys/role_department';
import { BaseSysPermsService } from './perms';
import { BaseSysUserEntity } from '../../entity/sys/user';

/**
 * 描述
 */
@Provide()
export class BaseSysDepartmentService extends BaseService {
  @InjectEntityModel(BaseSysDepartmentEntity)
  baseSysDepartmentEntity: Repository<BaseSysDepartmentEntity>;

  @InjectEntityModel(BaseSysUserEntity)
  baseSysUserEntity: Repository<BaseSysUserEntity>;

  @InjectEntityModel(BaseSysRoleDepartmentEntity)
  baseSysRoleDepartmentEntity: Repository<BaseSysRoleDepartmentEntity>;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  @Inject()
  ctx;

  /**
   * 獲得部門選單
   */
  async list() {
    const isAdmin = await this.baseSysPermsService.isAdmin(
      this.ctx.admin.roleIds || []
    );
    // 部門權限
    const permsDepartmentArr = await this.baseSysPermsService.departmentIds(
      this.ctx.admin.userId
    );
    const currentUser = await this.baseSysUserEntity.findOneBy({
      id: this.ctx.admin.userId,
    });
    const currentDepartmentId = Number(currentUser?.departmentId || 0);
    const allDepartments = !isAdmin
      ? await this.baseSysDepartmentEntity.find()
      : [];
    const scopedDepartmentIds = _.uniq(
      [
        ...permsDepartmentArr,
        ...this.collectDepartmentWithAncestors(
          allDepartments,
          currentDepartmentId ? [currentDepartmentId] : []
        ),
      ].filter(id => Number(id) > 0)
    );

    // 過濾部門權限
    const find = this.baseSysDepartmentEntity.createQueryBuilder('a');
    if (!isAdmin) {
      find.andWhere(
        new Brackets(qb => {
          qb.where('a.id in (:...ids)', {
            ids: !_.isEmpty(scopedDepartmentIds)
              ? scopedDepartmentIds
              : [null],
          }).orWhere('a.userId = :userId', { userId: this.ctx.admin.userId });
        })
      );
    }
    find.addOrderBy('a.orderNum', 'ASC');
    const departments: BaseSysDepartmentEntity[] = await find.getMany();

    if (!_.isEmpty(departments)) {
      departments.forEach(e => {
        const parentMenu = departments.filter(m => {
          e.parentId = parseInt(e.parentId + '');
          if (e.parentId == m.id) {
            return m.name;
          }
        });
        if (!_.isEmpty(parentMenu)) {
          e.parentName = parentMenu[0].name;
        }
      });
    }
    return departments;
  }

  private collectDepartmentWithAncestors(
    departments: BaseSysDepartmentEntity[],
    ids: number[]
  ) {
    const map = new Map<number, BaseSysDepartmentEntity>();
    departments.forEach(item => map.set(Number(item.id), item));

    const result = new Set<number>();
    ids.forEach(id => {
      let currentId = Number(id || 0);
      while (currentId && !result.has(currentId)) {
        result.add(currentId);
        currentId = Number(map.get(currentId)?.parentId || 0);
      }
    });

    return [...result];
  }

  /**
   * 根據多個ID獲得部門權限資訊
   * @param {[]} roleIds 陣列
   * @param isAdmin 是否超管
   */
  async getByRoleIds(roleIds: number[], isAdmin) {
    if (!_.isEmpty(roleIds)) {
      if (isAdmin) {
        const result = await this.baseSysDepartmentEntity.find();
        return result.map(e => {
          return e.id;
        });
      }
      const result = await this.baseSysRoleDepartmentEntity
        .createQueryBuilder('a')
        .where('a.roleId in (:...roleIds)', { roleIds })
        .getMany();
      if (!_.isEmpty(result)) {
        return _.uniq(
          result.map(e => {
            return e.departmentId;
          })
        );
      }
    }
    return [];
  }

  /**
   * 部門排序
   * @param params
   */
  async order(params) {
    for (const e of params) {
      await this.baseSysDepartmentEntity.update(e.id, e);
    }
  }

  /**
   * 刪除
   */
  async delete(ids: number[]) {
    const { deleteUser } = this.ctx.request.body;
    await super.delete(ids);
    if (deleteUser) {
      await this.baseSysUserEntity.delete({ departmentId: In(ids) });
    } else {
      const topDepartment = await this.baseSysDepartmentEntity
        .createQueryBuilder('a')
        .where('a.parentId is null')
        .getOne();
      if (topDepartment) {
        await this.baseSysUserEntity.update(
          { departmentId: In(ids) },
          { departmentId: topDepartment.id }
        );
      }
    }
  }
}
