ALTER TABLE `crm_quote_order`
  ADD COLUMN `projectStatus` text NULL COMMENT '項目狀況' AFTER `execRemark`,
  ADD COLUMN `projectStatusImages` json NULL COMMENT '項目狀況圖片' AFTER `projectStatus`,
  ADD COLUMN `projectCueSheet` text NULL COMMENT '項目雲端Cue表' AFTER `projectStatusImages`;
