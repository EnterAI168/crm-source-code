import mysql from 'mysql2/promise';

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3308),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'cool-crm',
};

const keyName = 'quote_payment_condition';
const defaultValue = `付款方式：專案金額(含營業稅)共計新臺幣 {finalAmount} 元整，甲方於收到發票後，30 天內以匯款方式支付款項至乙方指定帳戶，匯款後提供後五碼及匯款日期以便甲方核對。
*本欄請注意：本單須雙方簽立完成後，送交乙方才會始得進行委刊作業。`;

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
      console.log(`付款條件引數已存在，id=${existing.id}，未覆蓋現有配置`);
      return;
    }

    const now = nowStr();
    const [result] = await conn.query(
      `INSERT INTO base_sys_param
        (createTime, updateTime, tenantId, keyName, name, data, dataType, remark)
       VALUES (?, ?, NULL, ?, '報價單付款條件', ?, 0, '報價單預覽和PDF匯出使用；支援佔位符 {finalAmount} 或 {amount}')`,
      [now, now, keyName, defaultValue]
    );
    console.log(`付款條件引數已寫入，id=${result.insertId}`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
