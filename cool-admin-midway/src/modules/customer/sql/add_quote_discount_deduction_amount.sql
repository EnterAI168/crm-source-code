ALTER TABLE `crm_quote_order`
  ADD COLUMN `discountDeductionAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '優惠超出15%扣除獎金金額' AFTER `grossProfitRate`;
