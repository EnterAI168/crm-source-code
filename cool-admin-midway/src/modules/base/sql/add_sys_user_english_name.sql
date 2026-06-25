ALTER TABLE `base_sys_user`
ADD COLUMN `englishName` varchar(100) NULL COMMENT '英文名稱' AFTER `name`;
