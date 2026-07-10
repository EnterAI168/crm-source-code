import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const OpenCC = require('../cool-admin-vue/node_modules/opencc-js');

const root = process.cwd();
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

const skipDirs = new Set([
  '.git',
  '.chrome-browseruse',
  'node_modules',
  'dist',
  'build',
  '.vite',
  '.output',
  'coverage',
]);

const textExts = new Set([
  '.cjs',
  '.conf',
  '.css',
  '.csv',
  '.d.ts',
  '.env',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.less',
  '.md',
  '.mjs',
  '.scss',
  '.sh',
  '.sql',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.vue',
  '.xml',
  '.yaml',
  '.yml',
]);

const textNames = new Set([
  'Dockerfile',
  'LICENSE',
  'NOTICE',
  'nginx.conf',
]);

function shouldSkipDir(name) {
  return skipDirs.has(name);
}

function isTextFile(filePath) {
  const name = path.basename(filePath);
  if (textNames.has(name)) return true;
  const ext = path.extname(filePath);
  return textExts.has(ext);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name)) {
        walk(path.join(dir, entry.name), files);
      }
      continue;
    }
    if (entry.isFile()) {
      const filePath = path.join(dir, entry.name);
      if (isTextFile(filePath)) files.push(filePath);
    }
  }
  return files;
}

function normalizeTaiwanText(text) {
  const rules = [
    ['\\u81fa\\u7063', '台灣'],
    ['\\u81fa\\u5e63', '台幣'],
    ['\\u65b0\\u81fa\\u5e63', '新台幣'],
    ['\\u9ed8\\u8a8d', '預設'],
    ['\\u90f5\\u7bb1', '信箱'],
    ['\\u624b\\u6a5f\\u865f(?!\\u78bc)', '手機號碼'],
    ['\\u624b\\u6a5f\\u865f\\u78bc\\u78bc', '手機號碼'],
    ['\\u8a31\\u53ef\\u6b0a', '權限'],
    ['\\u8edf\\u4ef6', '軟體'],
    ['\\u6587\\u6a94', '檔案'],
    ['\\u6587\\u4ef6', '檔案'],
    ['\\u6a94\\u6848\\u6a94\\u6848', '資料檔案'],
    ['\\u4fe1\\u606f', '資訊'],
    ['\\u767c\\u9001', '傳送'],
    ['\\u767c\\u4f48', '發布'],
    ['\\u8cec\\u865f', '帳號'],
    ['\\u5e33\\u6236', '帳號'],
    ['\\u7372\\u53d6', '取得'],
    ['\\u5f15\\u6578', '參數'],
    ['\\u5f8c\\u81fa', '後台'],
    ['\\u5168\\u57df\\u6027', '全域'],
  ];
  return rules.reduce(
    (content, [pattern, replacement]) => content.replace(new RegExp(pattern, 'g'), replacement),
    converter(text),
  );
}

let changed = 0;

for (const filePath of walk(root)) {
  const before = fs.readFileSync(filePath, 'utf8');
  const after = normalizeTaiwanText(before);

  if (after !== before) {
    fs.writeFileSync(filePath, after, 'utf8');
    changed += 1;
    console.log(path.relative(root, filePath));
  }
}

console.log(`已轉換 ${changed} 個文字檔案`);
