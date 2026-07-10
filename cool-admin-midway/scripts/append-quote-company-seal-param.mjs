import mysql from 'mysql2/promise';

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3308),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'cool-crm',
};

const keyName = 'quote_company_seal';

function nowStr() {
  const date = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    const [[existing]] = await conn.query(
      'SELECT id FROM base_sys_param WHERE keyName = ? LIMIT 1',
      [keyName]
    );
    if (existing) {
      console.log(`報價單乙方公章參數已存在，id=${existing.id}，未覆蓋現有配置`);
      return;
    }

    const now = nowStr();
    const [result] = await conn.query(
      `INSERT INTO base_sys_param
        (createTime, updateTime, tenantId, keyName, name, data, dataType, remark)
       VALUES (?, ?, NULL, ?, '報價單乙方公章', '', 2, '報價單預覽乙方簽章框使用；參數型別選擇檔案，上傳乙方公章圖片')`,
      [now, now, keyName]
    );
    console.log(`報價單乙方公章參數已寫入，id=${result.insertId}`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
