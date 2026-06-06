import mysql from 'mysql2/promise';

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3308),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'cool-crm',
};

function nowStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function grantParentByChild(conn, parentId, childId) {
  const [roles] = await conn.query(
    `SELECT DISTINCT roleId
       FROM base_sys_role_menu
      WHERE menuId = ?`,
    [childId]
  );
  const t = nowStr();
  for (const role of roles) {
    await conn.query(
      `INSERT INTO base_sys_role_menu (createTime, updateTime, tenantId, roleId, menuId)
       SELECT ?, ?, NULL, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM base_sys_role_menu WHERE roleId = ? AND menuId = ?
       )`,
      [t, t, role.roleId, parentId, role.roleId, parentId]
    );
  }
  return roles.length;
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    await conn.beginTransaction();

    const [[financeParent]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? AND type = 0 LIMIT 1',
      ['/crm/finance']
    );
    if (!financeParent) {
      throw new Error('未找到財務管理目錄：router=/crm/finance');
    }

    const [[remittance]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? LIMIT 1',
      ['/crm/remittance/list']
    );
    if (!remittance) {
      throw new Error('未找到匯款單選單：router=/crm/remittance/list');
    }

    const t = nowStr();
    await conn.query(
      `UPDATE base_sys_menu
          SET parentId = ?,
              name = '匯款管理',
              perms = 'crm:remittance:page',
              type = 1,
              icon = 'icon-money',
              orderNum = 3,
              viewPath = 'modules/customer/views/remittance.vue',
              keepAlive = 1,
              isShow = 1,
              updateTime = ?
        WHERE id = ?`,
      [financeParent.id, t, remittance.id]
    );

    const grantedRoleCount = await grantParentByChild(
      conn,
      financeParent.id,
      remittance.id
    );

    await conn.commit();
    console.log(
      `匯款管理選單已遷移，財務管理id=${financeParent.id}，匯款管理id=${remittance.id}，授權角色數=${grantedRoleCount}`
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
