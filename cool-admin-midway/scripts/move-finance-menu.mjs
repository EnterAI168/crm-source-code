import mysql from 'mysql2/promise';

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3308),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'cool-crm',
};

const CHILD_MENUS = [
  {
    name: '發票稽核',
    router: '/crm/invoice/audit',
    perms: 'crm:quoteInvoice:page',
    icon: 'icon-list',
    orderNum: 1,
    viewPath: 'modules/customer/views/invoice-audit.vue',
  },
  {
    name: '獎金統計',
    router: '/crm/bonus/accounting',
    perms: 'crm:bonusAccounting:page',
    icon: 'icon-chart',
    orderNum: 2,
    viewPath: 'modules/customer/views/bonus-accounting.vue',
  },
];

function nowStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function grantParentByChildren(conn, financeParentId, childIds) {
  const [roles] = await conn.query(
    `SELECT DISTINCT roleId
       FROM base_sys_role_menu
      WHERE menuId IN (?)`,
    [childIds]
  );
  const t = nowStr();
  for (const role of roles) {
    await conn.query(
      `INSERT INTO base_sys_role_menu (createTime, updateTime, tenantId, roleId, menuId)
       SELECT ?, ?, NULL, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM base_sys_role_menu WHERE roleId = ? AND menuId = ?
       )`,
      [t, t, role.roleId, financeParentId, role.roleId, financeParentId]
    );
  }
  return roles.length;
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    await conn.beginTransaction();

    const t = nowStr();
    const [[existingFinanceParent]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? AND type = 0 LIMIT 1',
      ['/crm/finance']
    );

    let financeParentId = existingFinanceParent?.id;
    if (!financeParentId) {
      const [result] = await conn.query(
        `INSERT INTO base_sys_menu
          (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
         VALUES (?, ?, NULL, NULL, '財務管理', '/crm/finance', NULL, 0, 'icon-wallet', 4, NULL, 1, 1)`,
        [t, t]
      );
      financeParentId = result.insertId;
    } else {
      await conn.query(
        `UPDATE base_sys_menu
            SET parentId = NULL,
                name = '財務管理',
                router = '/crm/finance',
                perms = NULL,
                type = 0,
                icon = 'icon-wallet',
                orderNum = 4,
                viewPath = NULL,
                keepAlive = 1,
                isShow = 1,
                updateTime = ?
          WHERE id = ?`,
        [t, financeParentId]
      );
    }

    const childIds = [];
    for (const child of CHILD_MENUS) {
      const [[menu]] = await conn.query(
        'SELECT id FROM base_sys_menu WHERE router = ? LIMIT 1',
        [child.router]
      );
      if (!menu) {
        throw new Error(`未找到待遷移選單：router=${child.router}`);
      }
      await conn.query(
        `UPDATE base_sys_menu
            SET parentId = ?,
                name = ?,
                perms = ?,
                type = 1,
                icon = ?,
                orderNum = ?,
                viewPath = ?,
                keepAlive = 1,
                isShow = 1,
                updateTime = ?
          WHERE id = ?`,
        [
          financeParentId,
          child.name,
          child.perms,
          child.icon,
          child.orderNum,
          child.viewPath,
          t,
          menu.id,
        ]
      );
      childIds.push(menu.id);
    }

    const grantedRoleCount = await grantParentByChildren(
      conn,
      financeParentId,
      childIds
    );

    await conn.commit();
    console.log(
      `財務管理選單已遷移，目錄id=${financeParentId}，子選單id=${childIds.join(',')}，授權角色數=${grantedRoleCount}`
    );
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
