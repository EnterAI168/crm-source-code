SET @allowance_apply_status_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'allowanceApplyStatus'
);

SET @allowance_apply_user_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'allowanceApplyUserId'
);

SET @allowance_apply_time_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'allowanceApplyTime'
);

SET @allowance_apply_sql := IF(
  @allowance_apply_status_exists = 0,
  'ALTER TABLE `crm_quote_order`
     ADD COLUMN `allowanceApplyStatus` tinyint NOT NULL DEFAULT 0 COMMENT ''折讓申請狀態 0-未申請 1-已確認'' AFTER `priceRemark`',
  'SELECT 1'
);

PREPARE allowance_apply_stmt FROM @allowance_apply_sql;
EXECUTE allowance_apply_stmt;
DEALLOCATE PREPARE allowance_apply_stmt;

SET @allowance_apply_user_sql := IF(
  @allowance_apply_user_exists = 0,
  'ALTER TABLE `crm_quote_order`
     ADD COLUMN `allowanceApplyUserId` int NULL COMMENT ''折讓申請人ID'' AFTER `allowanceApplyStatus`',
  'SELECT 1'
);

PREPARE allowance_apply_user_stmt FROM @allowance_apply_user_sql;
EXECUTE allowance_apply_user_stmt;
DEALLOCATE PREPARE allowance_apply_user_stmt;

SET @allowance_apply_time_sql := IF(
  @allowance_apply_time_exists = 0,
  'ALTER TABLE `crm_quote_order`
     ADD COLUMN `allowanceApplyTime` varchar(20) NULL COMMENT ''折讓申請時間'' AFTER `allowanceApplyUserId`',
  'SELECT 1'
);

PREPARE allowance_apply_time_stmt FROM @allowance_apply_time_sql;
EXECUTE allowance_apply_time_stmt;
DEALLOCATE PREPARE allowance_apply_time_stmt;
