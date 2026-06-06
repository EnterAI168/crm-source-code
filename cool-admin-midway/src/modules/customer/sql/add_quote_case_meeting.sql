SET @case_meeting_flag_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'caseMeetingFlag'
);

SET @case_meeting_flag_sql := IF(
  @case_meeting_flag_exists = 0,
  'ALTER TABLE `crm_quote_order` ADD COLUMN `caseMeetingFlag` tinyint NOT NULL DEFAULT 1 COMMENT ''是否召開案情會議 0-否 1-是'' AFTER `contractRemark`',
  'SELECT 1'
);
PREPARE case_meeting_flag_stmt FROM @case_meeting_flag_sql;
EXECUTE case_meeting_flag_stmt;
DEALLOCATE PREPARE case_meeting_flag_stmt;

SET @case_meeting_user_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'caseMeetingUpdateUserId'
);

SET @case_meeting_user_sql := IF(
  @case_meeting_user_exists = 0,
  'ALTER TABLE `crm_quote_order` ADD COLUMN `caseMeetingUpdateUserId` int NULL COMMENT ''案情會議更新人ID'' AFTER `caseMeetingFlag`',
  'SELECT 1'
);
PREPARE case_meeting_user_stmt FROM @case_meeting_user_sql;
EXECUTE case_meeting_user_stmt;
DEALLOCATE PREPARE case_meeting_user_stmt;

SET @case_meeting_time_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'caseMeetingUpdateTime'
);

SET @case_meeting_time_sql := IF(
  @case_meeting_time_exists = 0,
  'ALTER TABLE `crm_quote_order` ADD COLUMN `caseMeetingUpdateTime` varchar(20) NULL COMMENT ''案情會議更新時間'' AFTER `caseMeetingUpdateUserId`',
  'SELECT 1'
);
PREPARE case_meeting_time_stmt FROM @case_meeting_time_sql;
EXECUTE case_meeting_time_stmt;
DEALLOCATE PREPARE case_meeting_time_stmt;

UPDATE `crm_quote_order`
SET `caseMeetingFlag` = 1
WHERE `caseMeetingFlag` IS NULL;
