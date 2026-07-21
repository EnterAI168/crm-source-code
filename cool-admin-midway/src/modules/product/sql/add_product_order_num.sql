ALTER TABLE `product_info`
  ADD COLUMN `orderNum` INT NOT NULL DEFAULT 0 COMMENT '排序值' AFTER `departmentId`;
