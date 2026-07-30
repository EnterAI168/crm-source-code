-- 產品預設備註 + 報價明細快照欄位
-- 可重複執行

-- 1) 產品表增加預設備註
SET @product_default_remark_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'product_info'
    AND COLUMN_NAME = 'defaultRemark'
);

SET @product_default_remark_sql := IF(
  @product_default_remark_exists = 0,
  'ALTER TABLE `product_info`
     ADD COLUMN `defaultRemark` text NULL COMMENT ''預設備註'' AFTER `description`',
  'SELECT ''product_info.defaultRemark already exists'' AS message'
);

PREPARE stmt FROM @product_default_remark_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 報價明細增加預設備註（業務可改）
SET @item_default_remark_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_order_item'
    AND COLUMN_NAME = 'defaultRemark'
);

SET @item_default_remark_sql := IF(
  @item_default_remark_exists = 0,
  'ALTER TABLE `crm_quote_order_item`
     ADD COLUMN `defaultRemark` text NULL COMMENT ''預設備註（業務可改）'' AFTER `grossProfitAmount`',
  'SELECT ''crm_quote_order_item.defaultRemark already exists'' AS message'
);

PREPARE stmt FROM @item_default_remark_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) 報價明細增加來源預設備註快照
SET @item_source_default_remark_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_order_item'
    AND COLUMN_NAME = 'sourceDefaultRemark'
);

SET @item_source_default_remark_sql := IF(
  @item_source_default_remark_exists = 0,
  'ALTER TABLE `crm_quote_order_item`
     ADD COLUMN `sourceDefaultRemark` text NULL COMMENT ''產品預設備註快照（用於判斷是否修改）'' AFTER `defaultRemark`',
  'SELECT ''crm_quote_order_item.sourceDefaultRemark already exists'' AS message'
);

PREPARE stmt FROM @item_source_default_remark_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
