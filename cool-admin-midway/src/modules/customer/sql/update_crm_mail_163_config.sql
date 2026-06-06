INSERT INTO `base_sys_param` (`keyName`, `name`, `data`, `dataType`, `remark`, `createTime`, `updateTime`)
VALUES (
  'crmMail',
  'CRM郵件發送配置',
  '{"host":"smtp.163.com","port":465,"secure":true,"user":"querenjian2026@163.com","pass":"WZcAWsR343JJYjLT","from":"querenjian2026@163.com","senderName":""}',
  0,
  'CRM郵件發送方配置；163郵箱使用授權碼作為 pass',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `data` = VALUES(`data`),
  `dataType` = VALUES(`dataType`),
  `remark` = VALUES(`remark`),
  `updateTime` = NOW();
