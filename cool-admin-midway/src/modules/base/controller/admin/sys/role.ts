import { Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { Context } from '@midwayjs/koa';
import { BaseSysRoleEntity } from '../../../entity/sys/role';
import { BaseSysPermsService } from '../../../service/sys/perms';
import { BaseSysRoleService } from '../../../service/sys/role';

/**
 * 系統角色
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: BaseSysRoleEntity,
  service: BaseSysRoleService,
  // 新增的時候插入當前使用者ID
  insertParam: async (ctx: Context) => {
    return {
      userId: ctx.admin.userId,
    };
  },
  pageQueryOp: {
    keyWordLikeFields: ['a.name', 'a.label'],
    where: async (ctx: Context) => {
      const { userId, roleIds, username } = ctx.admin;
      const baseSysPermsService = await ctx.requestContext.getAsync(
        BaseSysPermsService
      );
      const isAdmin = await baseSysPermsService.isAdmin(roleIds);
      return [
        // 超級管理員的角色不展示
        ['a.label != :label', { label: 'admin' }],
        // 非超管僅能查看自己建立或擁有的角色
        [
          `(a.userId=:userId or a.id in (${roleIds.join(',')}))`,
          { userId },
          username !== 'admin' && !isAdmin,
        ],
      ];
    },
  },
})
export class BaseSysRoleController extends BaseController {}
