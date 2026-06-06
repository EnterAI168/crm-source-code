SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayInvoiceNo'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayInvoiceNo` varchar(20) DEFAULT NULL COMMENT ''綠界發票號碼'' AFTER `auditRemark`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayInvoiceDate'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayInvoiceDate` varchar(30) DEFAULT NULL COMMENT ''綠界發票日期'' AFTER `ecpayInvoiceNo`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayRandomNumber'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayRandomNumber` varchar(10) DEFAULT NULL COMMENT ''綠界發票隨機碼'' AFTER `ecpayInvoiceDate`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayIssueStatus'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayIssueStatus` tinyint NOT NULL DEFAULT 0 COMMENT ''綠界開票狀態 0-未開票 1-開票中 2-已開票 3-開票失敗'' AFTER `ecpayRandomNumber`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayIssueError'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayIssueError` text DEFAULT NULL COMMENT ''綠界開票失敗原因'' AFTER `ecpayIssueStatus`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayIssueTime'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayIssueTime` varchar(30) DEFAULT NULL COMMENT ''綠界開票時間'' AFTER `ecpayIssueError`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayIssueResponse'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayIssueResponse` text DEFAULT NULL COMMENT ''綠界開票返回內容'' AFTER `ecpayIssueTime`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_invoice'
    AND index_name = 'IDX_crm_quote_invoice_ecpayInvoiceNo'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD INDEX `IDX_crm_quote_invoice_ecpayInvoiceNo` (`ecpayInvoiceNo`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_invoice'
    AND index_name = 'IDX_crm_quote_invoice_ecpayIssueStatus'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD INDEX `IDX_crm_quote_invoice_ecpayIssueStatus` (`ecpayIssueStatus`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayInvalidStatus'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayInvalidStatus` tinyint NOT NULL DEFAULT 0 COMMENT ''綠界作廢狀態 0-未作廢 1-作廢中 2-已作廢 3-作廢失敗'' AFTER `ecpayIssueResponse`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayInvalidTime'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayInvalidTime` varchar(30) DEFAULT NULL COMMENT ''綠界作廢時間'' AFTER `ecpayInvalidStatus`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayInvalidReason'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayInvalidReason` varchar(255) DEFAULT NULL COMMENT ''綠界作廢原因'' AFTER `ecpayInvalidTime`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayInvalidError'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayInvalidError` text DEFAULT NULL COMMENT ''綠界作廢失敗原因'' AFTER `ecpayInvalidReason`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_invoice'
    AND COLUMN_NAME = 'ecpayInvalidResponse'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD COLUMN `ecpayInvalidResponse` text DEFAULT NULL COMMENT ''綠界作廢返回內容'' AFTER `ecpayInvalidError`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_invoice'
    AND index_name = 'IDX_crm_quote_invoice_ecpayInvalidStatus'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE `crm_quote_invoice` ADD INDEX `IDX_crm_quote_invoice_ecpayInvalidStatus` (`ecpayInvalidStatus`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `base_sys_param` (`keyName`, `name`, `data`, `dataType`, `remark`, `createTime`, `updateTime`)
SELECT
  'crmEcpayInvoice',
  'CRM綠界發票開票配置',
  '{"enabled":true,"env":"stage","mode":"b2b","merchantId":"2000132","hashKey":"ejCk326UnaZWKisg","hashIv":"q9jcZX8Ib9LM8wYk","endpoint":"https://einvoice-stage.ecpay.com.tw/B2BInvoice/Issue","invalidEndpoint":"https://einvoice-stage.ecpay.com.tw/B2BInvoice/Invalid","taxType":"1","invType":"07","itemWord":"項","timeout":15000}',
  0,
  '綠界 B2B 電子發票 Issue 配置；正式環境請改 env=prod、endpoint 改正式 B2B，並替換正式 MerchantID/HashKey/HashIV',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM `base_sys_param` WHERE `keyName` = 'crmEcpayInvoice');
