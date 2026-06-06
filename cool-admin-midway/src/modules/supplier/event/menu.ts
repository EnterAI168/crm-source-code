import { CoolEvent, Event } from '@cool-midway/core';
import { Inject } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseSysMenuEntity } from '../../base/entity/sys/menu';
import { BaseSysRoleMenuEntity } from '../../base/entity/sys/role_menu';
import { BaseSysUserRoleEntity } from '../../base/entity/sys/user_role';
import { BaseSysPermsService } from '../../base/service/sys/perms';

const REMITTANCE_MENU = {
  name: '匯款管理',
  router: '/crm/remittance/list',
  perms: 'crm:remittance:page',
  type: 1,
  icon: 'icon-money',
  orderNum: 3,
  viewPath: 'modules/customer/views/remittance.vue',
  keepAlive: true,
  isShow: true,
};

const REMITTANCE_BUTTONS = [
  { name: '列表', perms: 'crm:remittance:page', orderNum: 1 },
  { name: '新增', perms: 'crm:remittance:add', orderNum: 2 },
  { name: '編輯', perms: 'crm:remittance:update', orderNum: 3 },
  { name: '刪除', perms: 'crm:remittance:delete', orderNum: 4 },
  { name: '檢視', perms: 'crm:remittance:info', orderNum: 5 },
  { name: '匯款', perms: 'crm:remittance:remit', orderNum: 6 },
];

@CoolEvent()
export class SupplierMenuEvent {
  @InjectEntityModel(BaseSysMenuEntity)
  baseSysMenuEntity: Repository<BaseSysMenuEntity>;

  @InjectEntityModel(BaseSysRoleMenuEntity)
  baseSysRoleMenuEntity: Repository<BaseSysRoleMenuEntity>;

  @InjectEntityModel(BaseSysUserRoleEntity)
  baseSysUserRoleEntity: Repository<BaseSysUserRoleEntity>;

  @Inject()
  baseSysPermsService: BaseSysPermsService;

  @Event('onServerReadyOnce')
  async onServerReady() {
    await this.syncRemittanceMenu();
  }

  private async syncRemittanceMenu() {
    const financeRoot = await this.baseSysMenuEntity.findOneBy({
      router: '/crm/finance',
    });

    if (!financeRoot) {
      return;
    }

    const remittanceMenu = await this.upsertRemittanceMenu(financeRoot.id);
    const remittanceButtonIds: number[] = [];

    for (const button of REMITTANCE_BUTTONS) {
      const menu = await this.upsertRemittanceButton(remittanceMenu.id, button);
      remittanceButtonIds.push(menu.id);
    }

    const roleMenus = await this.baseSysRoleMenuEntity.findBy({
      menuId: financeRoot.id,
    });

    const roleIds = [...new Set(roleMenus.map(item => Number(item.roleId)))].filter(
      item => item > 0
    );

    if (roleIds.length === 0) {
      return;
    }

    const targetMenuIds = [remittanceMenu.id, ...remittanceButtonIds];
    const existingLinks = await this.baseSysRoleMenuEntity.findBy({
      roleId: In(roleIds),
      menuId: In(targetMenuIds),
    });

    const existingLinkSet = new Set(
      existingLinks.map(item => `${item.roleId}_${item.menuId}`)
    );

    const newLinks: Array<{ roleId: number; menuId: number }> = [];

    for (const roleId of roleIds) {
      for (const menuId of targetMenuIds) {
        const key = `${roleId}_${menuId}`;
        if (!existingLinkSet.has(key)) {
          newLinks.push({ roleId, menuId });
        }
      }
    }

    if (newLinks.length > 0) {
      await this.baseSysRoleMenuEntity.save(newLinks);
    }

    const userRoles = await this.baseSysUserRoleEntity.findBy({
      roleId: In(roleIds),
    });
    const userIds = [...new Set(userRoles.map(item => Number(item.userId)))].filter(
      item => item > 0
    );

    for (const userId of userIds) {
      await this.baseSysPermsService.rebuildPermsCache(userId, false);
    }
  }

  private async upsertRemittanceMenu(parentId: number) {
    const current = await this.baseSysMenuEntity.findOneBy({
      router: REMITTANCE_MENU.router,
    });

    return await this.baseSysMenuEntity.save({
      id: current?.id,
      parentId,
      ...REMITTANCE_MENU,
    });
  }

  private async upsertRemittanceButton(
    parentId: number,
    button: { name: string; perms: string; orderNum: number }
  ) {
    const current = await this.baseSysMenuEntity.findOneBy({
      perms: button.perms,
      type: 2,
    });

    return await this.baseSysMenuEntity.save({
      id: current?.id,
      parentId,
      name: button.name,
      router: null,
      perms: button.perms,
      type: 2,
      icon: null,
      orderNum: button.orderNum,
      viewPath: null,
      keepAlive: false,
      isShow: false,
    });
  }
}
