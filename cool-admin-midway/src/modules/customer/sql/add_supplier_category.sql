ALTER TABLE `crm_supplier`
ADD COLUMN `category` varchar(100) NULL COMMENT '廠商分類' AFTER `companyName`;
