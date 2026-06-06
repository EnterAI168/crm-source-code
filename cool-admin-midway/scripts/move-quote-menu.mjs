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

async function grantParentToQuoteRoles(conn, quoteParentId, quoteListId) {
  const [roles] = await conn.query(
    `SELECT DISTINCT roleId
       FROM base_sys_role_menu
      WHERE menuId = ?`
    ,
    [quoteListId]
  );
  const t = nowStr();
  for (const role of roles) {
    await conn.query(
      `INSERT INTO base_sys_role_menu (createTime, updateTime, tenantId, roleId, menuId)
       SELECT ?, ?, NULL, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM base_sys_role_menu WHERE roleId = ? AND menuId = ?
       )`,
      [t, t, role.roleId, quoteParentId, role.roleId, quoteParentId]
    );
  }
  return roles.length;
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    await conn.beginTransaction();

    const [[customerParent]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? AND type = 0 LIMIT 1',
      ['/crm/customer']
    );
    if (!customerParent) {
      throw new Error('未找到客戶管理目錄：router=/crm/customer');
    }

    const [[quoteList]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? LIMIT 1',
      ['/crm/quote/list']
    );
    if (!quoteList) {
      throw new Error('未找到報價單選單：router=/crm/quote/list');
    }

    const [[existingQuoteParent]] = await conn.query(
      'SELECT id FROM base_sys_menu WHERE router = ? AND type = 0 LIMIT 1',
      ['/crm/quote']
    );

    let quoteParentId = existingQuoteParent?.id;
    const t = nowStr();
    if (!quoteParentId) {
      const [result] = await conn.query(
        `INSERT INTO base_sys_menu
          (createTime, updateTime, tenantId, parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow)
         VALUES (?, ?, NULL, NULL, '報價單管理', '/crm/quote', NULL, 0, 'icon-list', 3, NULL, 1, 1)`,
        [t, t]
      );
      quoteParentId = result.insertId;
    } else {
      await conn.query(
        `UPDATE base_sys_menu
            SET parentId = NULL,
                name = '報價單管理',
                router = '/crm/quote',
                perms = NULL,
                type = 0,
                icon = 'icon-list',
                orderNum = 3,
                viewPath = NULL,
                keepAlive = 1,
                isShow = 1,
                updateTime = ?
          WHERE id = ?`,
        [t, quoteParentId]
      );
    }

    await conn.query(
      `UPDATE base_sys_menu
          SET parentId = ?,
              name = '報價單列表',
              type = 1,
              icon = 'icon-list',
              orderNum = 1,
              perms = 'crm:quoteOrder:page',
              viewPath = 'modules/customer/views/quote.vue',
              keepAlive = 1,
              isShow = 1,
              updateTime = ?
        WHERE id = ?`,
      [quoteParentId, t, quoteList.id]
    );

    const grantedRoleCount = await grantParentToQuoteRoles(
      conn,
      quoteParentId,
      quoteList.id
    );

    await conn.commit();
    console.log(
      `報價單管理選單已遷移，目錄id=${quoteParentId}，報價單列表id=${quoteList.id}，授權角色數=${grantedRoleCount}`
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
