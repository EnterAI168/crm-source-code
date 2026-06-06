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
