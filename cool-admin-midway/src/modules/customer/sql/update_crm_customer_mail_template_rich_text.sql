INSERT INTO `base_sys_param` (`keyName`, `name`, `data`, `dataType`, `remark`, `createTime`, `updateTime`)
VALUES (
  'crmCustomerMailTemplate',
  'CRM客戶公池郵件模板',
  '<div style="font-family: Arial, ''Microsoft JhengHei'', sans-serif; line-height: 1.8; color: #333;"><p>您好：</p><p>以下為客戶資料，請查收。</p><table cellpadding="8" cellspacing="0" style="border-collapse: collapse; min-width: 520px;"><tr><td style="border:1px solid #ddd;">公司名稱</td><td style="border:1px solid #ddd;">{{companyName}}</td></tr><tr><td style="border:1px solid #ddd;">聯絡人</td><td style="border:1px solid #ddd;">{{contactName}}</td></tr><tr><td style="border:1px solid #ddd;">手機號</td><td style="border:1px solid #ddd;">{{mobile}}</td></tr><tr><td style="border:1px solid #ddd;">郵箱</td><td style="border:1px solid #ddd;">{{email}}</td></tr><tr><td style="border:1px solid #ddd;">地址</td><td style="border:1px solid #ddd;">{{address}}</td></tr></table></div>',
  1,
  '客戶公池郵件富文本內容模板；固定 keyName；支援變數 {{companyName}}、{{contactName}}、{{mobile}}、{{email}}、{{address}}',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `data` = VALUES(`data`),
  `dataType` = VALUES(`dataType`),
  `remark` = VALUES(`remark`),
  `updateTime` = NOW();
