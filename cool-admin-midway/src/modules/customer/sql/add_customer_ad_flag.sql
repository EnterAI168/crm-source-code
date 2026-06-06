SET @customer_ad_flag_column_count := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_customer_info'
    AND COLUMN_NAME = 'isAdCustomer'
);

SET @customer_ad_flag_sql := IF(
  @customer_ad_flag_column_count = 0,
  'ALTER TABLE `crm_customer_info` ADD COLUMN `isAdCustomer` tinyint NOT NULL DEFAULT 0 COMMENT ''是否廣告投放客戶 0-否 1-是'' AFTER `isVip`',
  'SELECT 1'
);

PREPARE customer_ad_flag_stmt FROM @customer_ad_flag_sql;
EXECUTE customer_ad_flag_stmt;
DEALLOCATE PREPARE customer_ad_flag_stmt;
