CREATE TABLE IF NOT EXISTS `crm_contract_reminder` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `createTime` varchar(255) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(255) NOT NULL COMMENT '更新時間',
  `tenantId` bigint NULL COMMENT '租戶ID',
  `userId` bigint NOT NULL COMMENT '提醒使用者ID',
  `userName` varchar(100) NULL COMMENT '提醒使用者名稱稱',
  `notifyDate` varchar(10) NOT NULL COMMENT '提醒日期 YYYY-MM-DD',
  `quoteCount` int NOT NULL DEFAULT 0 COMMENT '提醒報價單數量',
  `content` text NOT NULL COMMENT '提醒內容',
  `detailJson` json NULL COMMENT '提醒明細',
  `isRead` tinyint NOT NULL DEFAULT 0 COMMENT '是否已讀 0-否 1-是',
  `readTime` varchar(20) NULL COMMENT '閱讀時間',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_crm_contract_reminder_user_date_deleted` (`userId`, `notifyDate`, `isDeleted`),
  KEY `IDX_crm_contract_reminder_user` (`userId`),
  KEY `IDX_crm_contract_reminder_date` (`notifyDate`),
  KEY `IDX_crm_contract_reminder_read` (`isRead`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合約回傳提醒';

INSERT INTO task_info
  (createTime, updateTime, tenantId, jobId, repeatConf, name, cron, `limit`, every, remark, status, startDate, endDate, data, service, type, nextRunTime, taskType, lastExecuteTime, lockExpireTime)
SELECT
  NOW(), NOW(), NULL, 'crm-contract-reminder-daily', NULL, '合約回傳每日提醒',
  '0 0 10 * * *', NULL, NULL, '每天10:00提醒業務人員儘快回傳已審核通過報價單合約',
  1, NULL, NULL, NULL, 'CrmContractReminderService.generateDailyReminders()', 0, NULL, 0, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM task_info WHERE jobId = 'crm-contract-reminder-daily');
