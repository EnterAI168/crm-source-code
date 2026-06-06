ALTER TABLE `crm_quote_invoice`
  ADD COLUMN IF NOT EXISTS `sendStatus` tinyint NOT NULL DEFAULT 0 COMMENT '郵件發送狀態 0-待發送 1-發送中 2-已發送 3-發送失敗' AFTER `scheduledSendTime`,
  ADD COLUMN IF NOT EXISTS `sentTime` varchar(30) DEFAULT NULL COMMENT '郵件發送時間' AFTER `sendStatus`,
  ADD COLUMN IF NOT EXISTS `sendError` text DEFAULT NULL COMMENT '郵件發送失敗原因' AFTER `sentTime`;

INSERT INTO `base_sys_param` (`keyName`, `name`, `data`, `dataType`, `remark`, `createTime`, `updateTime`)
SELECT
  'crmMail',
  'CRM郵件發送配置',
  '{"host":"smtp.163.com","port":465,"secure":true,"user":"querenjian2026@163.com","pass":"WZcAWsR343JJYjLT","from":"querenjian2026@163.com","senderName":""}',
  0,
  'CRM郵件發送方配置；163郵箱使用授權碼作為 pass',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM `base_sys_param` WHERE `keyName` = 'crmMail');

INSERT INTO `base_sys_param` (`keyName`, `name`, `data`, `dataType`, `remark`, `createTime`, `updateTime`)
SELECT
  'crmInvoiceMailTemplate',
  'CRM發票郵件模板',
  '{"subject":"確認鍵發票_{{quoteName}}{{invoicePeriodText}}","html":"<div style=\"font-family: Arial, ''Microsoft JhengHei'', sans-serif; line-height: 1.8; color: #333;\"><p>您好，</p><p>附件為「{{quoteName}}{{invoicePeriodText}}」發票，敬請查收。</p><p>若有任何問題，再請不吝告知，謝謝。</p><p>祝 順心</p><p>確認鍵智創科技股份有限公司</p></div>","text":"您好，\\n附件為「{{quoteName}}{{invoicePeriodText}}」發票，敬請查收。\\n若有任何問題，再請不吝告知，謝謝。\\n祝 順心\\n確認鍵智創科技股份有限公司","attachments":[]}',
  0,
  '發票郵件內容模板；固定 keyName；支援 attachments 陣列，例如 [{"filename":"附件.pdf","path":"D:/file/附件.pdf"}]',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM `base_sys_param` WHERE `keyName` = 'crmInvoiceMailTemplate');

INSERT INTO `base_sys_param` (`keyName`, `name`, `data`, `dataType`, `remark`, `createTime`, `updateTime`)
SELECT
  'crmCustomerMailTemplate',
  'CRM客戶公池郵件模板',
  '<div style="font-family: Arial, ''Microsoft JhengHei'', sans-serif; line-height: 1.8; color: #333;"><p>您好：</p><p>以下為客戶資料，請查收。</p><table cellpadding="8" cellspacing="0" style="border-collapse: collapse; min-width: 520px;"><tr><td style="border:1px solid #ddd;">公司名稱</td><td style="border:1px solid #ddd;">{{companyName}}</td></tr><tr><td style="border:1px solid #ddd;">聯絡人</td><td style="border:1px solid #ddd;">{{contactName}}</td></tr><tr><td style="border:1px solid #ddd;">手機號</td><td style="border:1px solid #ddd;">{{mobile}}</td></tr><tr><td style="border:1px solid #ddd;">郵箱</td><td style="border:1px solid #ddd;">{{email}}</td></tr><tr><td style="border:1px solid #ddd;">地址</td><td style="border:1px solid #ddd;">{{address}}</td></tr></table></div>',
  1,
  '客戶公池郵件富文本內容模板；固定 keyName；支援變數 {{companyName}}、{{contactName}}、{{mobile}}、{{email}}、{{address}}',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM `base_sys_param` WHERE `keyName` = 'crmCustomerMailTemplate');

SET @invoice_menu_id := (SELECT `id` FROM `base_sys_menu` WHERE `perms` = 'crm:quoteInvoice:page' LIMIT 1);

INSERT INTO `base_sys_menu` (`parentId`, `name`, `router`, `perms`, `type`, `icon`, `orderNum`, `viewPath`, `keepAlive`, `isShow`, `createTime`, `updateTime`)
SELECT @invoice_menu_id, '發送郵件', NULL, 'crm:quoteInvoice:send', 2, NULL, 5, NULL, 0, 0, NOW(), NOW()
WHERE @invoice_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `base_sys_menu` WHERE `parentId` = @invoice_menu_id AND `perms` = 'crm:quoteInvoice:send');

INSERT INTO `base_sys_menu` (`parentId`, `name`, `router`, `perms`, `type`, `icon`, `orderNum`, `viewPath`, `keepAlive`, `isShow`, `createTime`, `updateTime`)
SELECT @invoice_menu_id, '執行定時任務', NULL, 'crm:quoteInvoice:handleScheduled', 2, NULL, 6, NULL, 0, 0, NOW(), NOW()
WHERE @invoice_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `base_sys_menu` WHERE `parentId` = @invoice_menu_id AND `perms` = 'crm:quoteInvoice:handleScheduled');

INSERT INTO `task_info` (
  `createTime`,
  `updateTime`,
  `tenantId`,
  `jobId`,
  `repeatConf`,
  `name`,
  `cron`,
  `limit`,
  `every`,
  `remark`,
  `status`,
  `startDate`,
  `endDate`,
  `data`,
  `service`,
  `type`,
  `nextRunTime`,
  `taskType`,
  `lastExecuteTime`,
  `lockExpireTime`
)
SELECT
  NOW(),
  NOW(),
  NULL,
  'crm-quote-invoice-schedule',
  NULL,
  '發票申請和郵件發送巡檢',
  '0 */10 * * * *',
  NULL,
  NULL,
  '每10分鐘執行一次：提前兩天生成發票審核申請；審核通過後按發票票期當天12點發送客戶郵件',
  1,
  NULL,
  NULL,
  NULL,
  'CrmQuoteInvoiceService.handleScheduledInvoices()',
  0,
  NULL,
  0,
  NULL,
  NULL
WHERE NOT EXISTS (SELECT 1 FROM `task_info` WHERE `jobId` = 'crm-quote-invoice-schedule');
