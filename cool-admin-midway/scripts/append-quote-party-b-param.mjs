import mysql from 'mysql2/promise';

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3308),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'cool-crm',
};

const keyName = 'quote_party_b';
const defaultValue = {
  companyName: '確認鍵智創科技股份有限公司',
  address: '',
  taxNumber: '',
  contactName: 'vicky',
  email: 'vicky@enterimc.com',
  mobile: '',
  bankAccountName: '確認鍵智創科技股份有限公司',
  bankCode: '012',
  bankName: '臺北富邦銀行',
  bankAccountNo: '82110000259100',
};

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
      console.log(`報價單乙方資料參數已存在，id=${existing.id}，未覆蓋現有配置`);
      return;
    }

    const now = nowStr();
    const [result] = await conn.query(
      `INSERT INTO base_sys_param
        (createTime, updateTime, tenantId, keyName, name, data, dataType, remark)
       VALUES (?, ?, NULL, ?, '報價單乙方資料', ?, 0, '報價單預覽和PDF匯出使用，JSON格式；存摺封面圖片請單獨配置 quote_bank_cover')`,
      [now, now, keyName, JSON.stringify(defaultValue, null, 2)]
    );
    console.log(`報價單乙方資料參數已寫入，id=${result.insertId}`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
