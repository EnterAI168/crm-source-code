import { Inject, InjectClient, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Equal, In, Repository } from 'typeorm';
import { BaseSysUserEntity } from '../../entity/sys/user';
import { BaseSysPermsService } from './perms';
import * as _ from 'lodash';
import { BaseSysUserRoleEntity } from '../../entity/sys/user_role';
import * as md5 from 'md5';
import { BaseSysDepartmentEntity } from '../../entity/sys/department';
import { CachingFactory, MidwayCache } from '@midwayjs/cache-manager';
import { BaseSysRoleEntity } from '../../entity/sys/role';

/**
 * 系统用户
 */
@Provide()
export class BaseSysUserService extends BaseService {
  private readonly INTERNAL_ROLE_LABEL = 'office_clerk';

  private readonly INTERNAL_MANAGER_ROLE_LABEL = 'office_clerk_manager';

  private readonly BOSS_LABEL = 'boss';

  private readonly ADMIN_LABEL = 'admin';

  private readonly LEVEL_MANAGER = '主管';

  private readonly LEVEL_SENIOR = '资深同仁';

  private readonly LEVEL_NORMAL = '一般同仁';

  @InjectEntityModel(BaseSysUserEntity)
  baseSysUserEntity: Repository<BaseSysUserEntity>;

  @InjectEntityModel(BaseSysUserRoleEntity)
  baseSysUserRoleEntity: Repository<BaseSysUserRoleEntity>;

  @InjectEntityModel(BaseSysDepartmentEntity)
  baseSysDepartmentEntity: Repository<BaseSysDepartmentEntity>;

  @InjectEntityModel(BaseSysRoleEntity)
  baseSysRoleEntity: Repository<BaseSysRoleEntity>;

  @InjectClient(CachingFactory, 'default')
  midwayCache: MidwayCache;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  @Inject()
  ctx;

  /**
   * 分页查询
   * @param query
   */
  async page(query) {
    const { keyWord, status, departmentIds = [], name, phone, email } = query;
    const userId = this.ctx.admin.userId;
    const roleLabels = await this.getCurrentRoleLabels();
    const canViewAll = roleLabels.some(label =>
      [this.BOSS_LABEL, this.ADMIN_LABEL].includes(label)
    );
    const currentUser = await this.baseSysUserEntity.findOneBy({ id: userId });
    const currentDepartmentId = Number(currentUser?.departmentId);
    const permsDepartmentArr = await this.baseSysPermsService.departmentIds(userId);
    const scopedDepartmentIds = Number.isFinite(currentDepartmentId) && currentDepartmentId > 0
      ? [currentDepartmentId]
      : !_.isEmpty(permsDepartmentArr)
        ? permsDepartmentArr
        : [];
    const sql = `
        SELECT
            a.id,a.name,a.nickName,a.headImg,a.email,a.remark,a.salary,a.level,a.status,a.createTime,a.updateTime,a.username,a.phone,a.departmentId,
            b.name as "departmentName"
        FROM
            base_sys_user a
            LEFT JOIN base_sys_department b on a.departmentId = b.id
        WHERE 1 = 1
            ${this.setSql(
              canViewAll && !_.isEmpty(departmentIds),
              'and a.departmentId in (?)',
              [departmentIds]
            )}
            ${this.setSql(status, 'and a.status = ?', [status])}
            ${this.setSql(name, 'and a.name LIKE ?', [`%${name}%`])}
            ${this.setSql(phone, 'and a.phone LIKE ?', [`%${phone}%`])}
            ${this.setSql(email, 'and a.email LIKE ?', [`%${email}%`])}
            ${this.setSql(keyWord, 'and (a.name LIKE ? or a.phone LIKE ? or a.email LIKE ?)', [
              `%${keyWord}%`,
              `%${keyWord}%`,
              `%${keyWord}%`,
            ])}
            ${this.setSql(true, 'and a.username != ?', ['admin'])}
            ${this.setSql(
              !canViewAll,
              'and (a.departmentId in (?) or a.id = ?)',
              [!_.isEmpty(scopedDepartmentIds) ? scopedDepartmentIds : [null], userId]
            )} `;
    const result = await this.sqlRenderPage(sql, query);
    // 匹配角色
    if (!_.isEmpty(result.list)) {
      const userIds = result.list.map(e => e.id);
      const roles: BaseSysRoleEntity[] = await this.nativeQuery(
        'SELECT b.name, a.userId FROM base_sys_user_role a LEFT JOIN base_sys_role b ON a.roleId = b.id WHERE a.userId in (?) ',
        [userIds]
      );
      result.list.forEach(e => {
        const arr = roles.filter(a => a.userId == e.id);

        e['roleIds'] = arr.map(a => a.userId);
        e['roleName'] = arr.map(a => a.name).join(',');
      });
    }
    return result;
  }

  /**
   * 移动部门
   * @param departmentId
   * @param userIds
   */
  async move(departmentId, userIds) {
    await this.baseSysUserEntity.update({ id: In(userIds) }, { departmentId });
  }

  /**
   * 获得个人信息
   */
  async person(userId) {
    const info = await this.baseSysUserEntity.findOneBy({
      id: Equal(userId),
    });
    delete info?.password;
    return info;
  }

  /**
   * 更新用户角色关系
   * @param user
   */
  async updateUserRole(user) {
    const roleIdList = this.normalizeRoleIdList(user.roleIdList);
    if (_.isEmpty(roleIdList)) {
      return;
    }
    if (user.username === 'admin') {
      throw new CoolCommException('非法操作~');
    }
    await this.baseSysUserRoleEntity.delete({ userId: user.id });
    if (roleIdList) {
      for (const roleId of roleIdList) {
        await this.baseSysUserRoleEntity.save({ userId: user.id, roleId });
      }
    }
    await this.baseSysPermsService.refreshPerms(user.id);
  }

  /**
   * 新增
   * @param param
   */
  async add(param) {
    const exists = await this.baseSysUserEntity.findOneBy({
      username: param.username,
    });
    if (!_.isEmpty(exists)) {
      throw new CoolCommException('用户名已经存在~');
    }
    await this.validateRoleAndLevel(param);
    param.password = md5(param.password);
    await super.add(param);
    await this.updateUserRole(param);
    return param.id;
  }

  /**
   * 根据ID获得信息
   * @param id
   */
  public async info(id) {
    const info = await this.baseSysUserEntity.findOneBy({ id });
    const userRoles = await this.nativeQuery(
      'select a.roleId from base_sys_user_role a where a.userId = ?',
      [id]
    );
    const department = await this.baseSysDepartmentEntity.findOneBy({
      id: info.departmentId,
    });
    if (info) {
      delete info.password;
      if (userRoles) {
        info.roleIdList = userRoles.map(e => {
          return parseInt(e.roleId);
        });
      }
    }
    delete info.password;
    if (department) {
      info.departmentName = department.name;
    }
    return info;
  }

  /**
   * 修改个人信息
   * @param param
   */
  public async personUpdate(param) {
    param.id = this.ctx.admin.userId;
    if (!_.isEmpty(param.password)) {
      param.password = md5(param.password);
      const oldPassword = md5(param.oldPassword);
      const userInfo = await this.baseSysUserEntity.findOneBy({ id: param.id });
      if (!userInfo) {
        throw new CoolCommException('用户不存在');
      }
      if (oldPassword !== userInfo.password) {
        throw new CoolCommException('原密码错误');
      }
      param.passwordV = userInfo.passwordV + 1;
      await this.midwayCache.set(
        `admin:passwordVersion:${param.id}`,
        param.passwordV
      );
    } else {
      delete param.password;
    }
    await this.baseSysUserEntity.save(param);
  }

  /**
   * 修改
   * @param param 数据
   */
  async update(param) {
    if (param.id && param.username === 'admin') {
      throw new CoolCommException('非法操作~');
    }
    await this.validateRoleAndLevel(param);
    if (!_.isEmpty(param.password)) {
      param.password = md5(param.password);
      const userInfo = await this.baseSysUserEntity.findOneBy({ id: param.id });
      if (!userInfo) {
        throw new CoolCommException('用户不存在');
      }
      param.passwordV = userInfo.passwordV + 1;
      await this.midwayCache.set(
        `admin:passwordVersion:${param.id}`,
        param.passwordV
      );
    } else {
      delete param.password;
    }
    if (param.status === 0) {
      await this.forbidden(param.id);
    }
    await this.baseSysUserEntity.save(param);
    await this.updateUserRole(param);
  }

  private normalizeRoleIdList(roleIdList: number[] | number | undefined): number[] {
    if (_.isEmpty(roleIdList)) {
      return [];
    }
    if (Array.isArray(roleIdList)) {
      return roleIdList.map(id => Number(id)).filter(id => !Number.isNaN(id));
    }
    const id = Number(roleIdList);
    return Number.isNaN(id) ? [] : [id];
  }

  private async validateRoleAndLevel(param) {
    if (param.roleIdList === undefined && param.level === undefined) {
      return;
    }
    const roleIdList = this.normalizeRoleIdList(param.roleIdList);
    param.roleIdList = roleIdList;
    if (_.isEmpty(roleIdList)) {
      delete param.level;
      return;
    }

    if (roleIdList.length > 1) {
      throw new CoolCommException('角色仅支持单选');
    }

    const roles = await this.baseSysRoleEntity.findBy({ id: In(roleIdList) });
    if (roles.length !== roleIdList.length) {
      throw new CoolCommException('角色不存在');
    }

    const roleLabel = roles[0]?.label;
    if (roleLabel === this.INTERNAL_MANAGER_ROLE_LABEL) {
      param.level = this.LEVEL_MANAGER;
      return;
    }

    if (roleLabel === this.INTERNAL_ROLE_LABEL) {
      if (
        ![this.LEVEL_SENIOR, this.LEVEL_NORMAL].includes(
          (param.level || '').trim()
        )
      ) {
        throw new CoolCommException('内勤角色级别只能选择资深同仁或一般同仁');
      }
      return;
    }

    delete param.level;
  }

  /**
   * 禁用用户
   * @param userId
   */
  async forbidden(userId) {
    await this.midwayCache.del(`admin:token:${userId}`);
  }

  private async getCurrentRoleLabels(): Promise<string[]> {
    const roleIds: number[] = this.ctx.admin.roleIds || [];
    if (_.isEmpty(roleIds)) {
      return [];
    }
    const roles = await this.baseSysRoleEntity.findBy({ id: In(roleIds) });
    return roles.map(role => role.label);
  }
}
