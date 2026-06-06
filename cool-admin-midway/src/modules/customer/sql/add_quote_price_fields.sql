ALTER TABLE `crm_quote_order`
	ADD COLUMN `discountRate` decimal(8,2) NOT NULL DEFAULT 0.00 COMMENT '優惠比例' AFTER `discountDeductionAmount`,
	ADD COLUMN `commission` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '佣金' AFTER `discountRate`,
	ADD COLUMN `execRemark` text NULL COMMENT '執行備註' AFTER `contractRemark`,
	ADD COLUMN `priceRemark` text NULL COMMENT '價格備註' AFTER `execRemark`;
