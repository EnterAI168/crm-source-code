SET @has_business_category := (
	SELECT COUNT(1)
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE()
	  AND TABLE_NAME = 'crm_supplier'
	  AND COLUMN_NAME = 'businessCategory'
);

SET @add_business_category_sql := IF(
	@has_business_category = 0,
	'ALTER TABLE `crm_supplier` ADD COLUMN `businessCategory` varchar(64) NULL COMMENT ''分類'' AFTER `category`',
	'SELECT 1'
);

PREPARE add_business_category_stmt FROM @add_business_category_sql;
EXECUTE add_business_category_stmt;
DEALLOCATE PREPARE add_business_category_stmt;

ALTER TABLE `crm_supplier`
MODIFY COLUMN `category` varchar(100) NULL COMMENT '廠商分類';

UPDATE `dict_type`
SET `name` = '廠商分類',
    `updateTime` = NOW()
WHERE `key` IN ('crmSupplierCategory', 'supplierCategory', 'crm_supplier_category');

INSERT INTO `dict_type` (`name`, `key`, `createTime`, `updateTime`)
SELECT '供應商分類', 'crmSupplierBusinessCategory', NOW(), NOW()
WHERE NOT EXISTS (
	SELECT 1 FROM `dict_type` WHERE `key` = 'crmSupplierBusinessCategory'
);
