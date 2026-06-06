<template>
	<cl-view-group ref="ViewGroup">
		<template #left>
			<dept-list ref="deptListRef" :drag="true" />
		</template>

		<template #right>
			<div class="sys-department-page">
				<div class="sys-department-page__toolbar">
					<el-button
						v-if="canAdd"
						type="primary"
						@click="onAddChild"
					>
						新增下級部門
					</el-button>
					<el-button
						v-if="canEdit"
						:disabled="!selectedDept"
						@click="onEdit"
					>
						編輯部門
					</el-button>
					<el-button
						v-if="canDelete"
						type="danger"
						:disabled="!canDeleteCurrent"
						@click="onDelete"
					>
						刪除部門
					</el-button>
					<el-button @click="onRefresh">重新整理</el-button>
				</div>

				<div class="sys-department-page__panel">
					<div class="sys-department-page__summary">
						<div class="sys-department-page__title">
							{{ selectedDept?.name || '部門管理' }}
						</div>
						<div class="sys-department-page__desc">
							右鍵左側部門節點可新增、編輯、刪除；右上角排序按鈕可拖拽並儲存順序。
						</div>
					</div>

					<el-descriptions
						v-if="selectedDept"
						:column="2"
						border
						class="sys-department-page__descriptions"
					>
						<el-descriptions-item label="部門名稱">
							{{ selectedDept.name || '-' }}
						</el-descriptions-item>
						<el-descriptions-item label="上級部門">
							{{ selectedDept.parentName || '頂級部門' }}
						</el-descriptions-item>
						<el-descriptions-item label="排序">
							{{ selectedDept.orderNum ?? 0 }}
						</el-descriptions-item>
						<el-descriptions-item label="建立時間">
							{{ selectedDept.createTime || '-' }}
						</el-descriptions-item>
						<el-descriptions-item label="更新時間">
							{{ selectedDept.updateTime || '-' }}
						</el-descriptions-item>
					</el-descriptions>

					<el-empty
						v-else
						description="請選擇左側部門節點"
						class="sys-department-page__empty"
					/>
				</div>
			</div>
		</template>
	</cl-view-group>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'sys-department'
});

import { computed, ref } from 'vue';
import DeptList from './user/components/dept-list.vue';
import { checkPerm } from '/$/base';
import { useViewGroup } from '/@/plugins/view';

const { ViewGroup } = useViewGroup({
	title: '部門管理'
});

const deptListRef = ref<any>();

const canAdd = computed(() => checkPerm('base:sys:department:add'));
const canEdit = computed(() => checkPerm('base:sys:department:update'));
const canDelete = computed(() => checkPerm('base:sys:department:delete'));

const selectedDept = computed(() => ViewGroup.value?.selected as Eps.BaseSysDepartmentEntity | undefined);

const canDeleteCurrent = computed(() => {
	return !!selectedDept.value?.parentId;
});

function getCurrentDept() {
	return selectedDept.value || deptListRef.value?.getList?.()?.[0];
}

function onRefresh() {
	deptListRef.value?.refresh?.();
}

function onAddChild() {
	const current = getCurrentDept();
	if (!current) return;

	deptListRef.value?.rowEdit?.({
		name: '',
		parentName: current.name,
		parentId: current.id
	});
}

function onEdit() {
	if (!selectedDept.value) return;
	deptListRef.value?.rowEdit?.(selectedDept.value);
}

function onDelete() {
	if (!selectedDept.value?.parentId) return;
	deptListRef.value?.rowDel?.(selectedDept.value);
}
</script>

<style scoped lang="scss">
.sys-department-page {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 12px 16px 16px;
	background: #fff;
}

.sys-department-page__toolbar {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	margin-bottom: 16px;
}

.sys-department-page__panel {
	flex: 1;
	border: 1px solid var(--el-border-color-light);
	border-radius: 10px;
	padding: 18px 20px;
	background: linear-gradient(180deg, #fcfdff 0%, #f7f9fc 100%);
}

.sys-department-page__summary {
	margin-bottom: 18px;
}

.sys-department-page__title {
	font-size: 20px;
	font-weight: 600;
	color: var(--el-text-color-primary);
}

.sys-department-page__desc {
	margin-top: 8px;
	font-size: 13px;
	color: var(--el-text-color-secondary);
}

.sys-department-page__descriptions {
	background: #fff;
}

.sys-department-page__empty {
	height: calc(100% - 60px);
}
</style>
