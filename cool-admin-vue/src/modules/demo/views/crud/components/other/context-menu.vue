<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>context-menu</el-tag>
			<span>右鍵選單</span>
		</div>

		<div class="c">
			<el-button @contextmenu="onContextMenu">預覽</el-button>
			<demo-code :files="['other/context-menu.vue']" />
		</div>

		<div class="f">
			<span class="date">2025-02-22</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ContextMenu } from '@cool-vue/crud';
import { Edit } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

function onContextMenu(e: MouseEvent) {
	ContextMenu.open(e, {
		list: [
			{
				label: '基礎',
				callback: done => {
					ElMessage.success('新增');
					done();
				}
			},
			{
				label: '圖示',
				suffixIcon: Edit,
				callback: done => {
					ElMessage.success('圖示');
					done();
				}
			},
			{
				label: '層級',
				children: [
					{
						label: '新增',
						callback: done => {
							ElMessage.success('新增');
							done();
						}
					},
					{
						label: '編輯',
						callback: done => {
							ElMessage.success('編輯');
							done();
						}
					},
					{
						label: '刪除',
						callback: done => {
							ElMessage.success('刪除');
							done();
						}
					}
				]
			}
		]
	});
}
</script>
