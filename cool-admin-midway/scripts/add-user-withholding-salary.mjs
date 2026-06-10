import mysql from 'mysql2/promise';

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3308),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'cool-crm',
};

const paramKey = 'employee_withholding_rate';

async function columnExists(conn) {
  const [[row]] = await conn.query(
    `
    SELECT COUNT(1) AS count
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'base_sys_user'
      AND column_name = 'withholdingSalary'
    `
  );
  return Number(row?.count || 0) > 0;
}

async function getWithholdingRate(conn) {
  const [[row]] = await conn.query(
    'SELECT data FROM base_sys_param WHERE keyName = ? LIMIT 1',
    [paramKey]
  );
  const rate = Number(row?.data || 0);
  if (!Number.isFinite(rate) || rate < 0) {
    return 0;
  }
  return Math.min(rate, 100);
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    if (!(await columnExists(conn))) {
      await conn.query(
        "ALTER TABLE base_sys_user ADD COLUMN withholdingSalary decimal(10,2) NULL COMMENT '扣繳工資' AFTER salary"
      );
      console.log('扣繳工資欄位已建立');
    } else {
      console.log('扣繳工資欄位已存在');
    }

    const rate = await getWithholdingRate(conn);
    const [result] = await conn.query(
      `
      UPDATE base_sys_user
      SET withholdingSalary = ROUND(COALESCE(salary, 0) - COALESCE(salary, 0) * (? / 100), 2)
      `,
      [rate]
    );
    console.log(`扣繳工資已回填，比例=${rate}%，更新 ${result.affectedRows} 筆`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
