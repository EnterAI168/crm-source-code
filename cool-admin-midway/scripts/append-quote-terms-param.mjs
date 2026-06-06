import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import AdmZip from 'adm-zip';

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

function decodeXml(text) {
  return String(text || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractParagraphs(xml) {
  return String(xml || '')
    .split(/<\/w:p>/)
    .map(part =>
      Array.from(part.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g))
        .map(match => decodeXml(match[1]))
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);
}

function loadTermsFromTemplate() {
  const filePaths = [
    path.join(process.cwd(), 'public', 'template', 'quote-template.docx'),
    path.join(process.cwd(), 'cool-admin-midway', 'public', 'template', 'quote-template.docx'),
  ];
  const filePath = filePaths.find(item => fs.existsSync(item));
  if (!filePath) {
    return [];
  }
  const zip = new AdmZip(filePath);
  const entry = zip.getEntry('word/document.xml');
  if (!entry) {
    return [];
  }
  const paragraphs = extractParagraphs(entry.getData().toString('utf8'));
  const startIndex = paragraphs.findIndex(item => item.includes('雙方合作條款約定'));
  const terms = startIndex >= 0 ? paragraphs.slice(startIndex + 1) : [];
  const items = [];
  for (let index = 0; index < terms.length; index++) {
    const text = terms[index];
    if (/^\d+$/.test(text) && terms[index + 1]) {
      items.push({ no: Number(text), text: terms[index + 1] });
      index++;
    } else if (text) {
      items.push({ no: items.length + 1, text });
    }
  }
  return items.length ? [{ title: '報價單條款', items }] : [];
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    const [[existing]] = await conn.query(
      'SELECT id FROM base_sys_param WHERE keyName = ? LIMIT 1',
      ['quote_terms']
    );
    if (existing) {
      console.log(`報價單條款引數已存在，id=${existing.id}，未覆蓋現有配置`);
      return;
    }
    const terms = loadTermsFromTemplate();
    if (!terms.length) {
      throw new Error('未能從 public/template/quote-template.docx 提取報價單條款');
    }
    const t = nowStr();
    const [result] = await conn.query(
      `INSERT INTO base_sys_param
        (createTime, updateTime, tenantId, keyName, name, data, dataType, remark)
       VALUES (?, ?, NULL, 'quote_terms', '報價單條款', ?, 0, '報價單預覽和PDF匯出使用，JSON格式：[{title,items:[{no,text}]}]')`,
      [t, t, JSON.stringify(terms, null, 2)]
    );
    console.log(`報價單條款引數已寫入，id=${result.insertId}`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
