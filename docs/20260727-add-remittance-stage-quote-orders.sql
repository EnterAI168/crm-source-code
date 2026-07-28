-- 匯款階段關聯報價單（可複選）欄位升級腳本
SET @column_exists = (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_remittance_stage'
    AND COLUMN_NAME = 'quoteOrderIds'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `crm_remittance_stage` ADD COLUMN `quoteOrderIds` TEXT NULL COMMENT ''關聯報價單ID清單'' AFTER `quoteOrderId`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
