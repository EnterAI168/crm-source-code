ALTER TABLE `crm_quote_order`
  ADD COLUMN `accompanySalesmanId` int NULL COMMENT '陪同管理業務ID' AFTER `salesmanId`,
  ADD INDEX `idx_quote_order_accompany_salesman_id` (`accompanySalesmanId`);
