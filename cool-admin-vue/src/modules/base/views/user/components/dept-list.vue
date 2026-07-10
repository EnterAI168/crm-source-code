<template>
	<div class="dept-tree">
		<div class="dept-tree__header">
			<el-text>{{ t('組織架構') }}</el-text>

			<div class="dept-tree__op">
				<div class="btns" v-if="isDrag">
					<div class="item" @click="treeOrder(true)">
						<cl-svg name="success" />
					</div>

					<div class="item" @click="treeOrder(false)">
						<cl-svg name="fail" />
					</div>
				</div>

				<template v-else>
					<div class="item" @click="refresh()">
						<el-tooltip :content="t('重新整理')">
							<cl-svg name="refresh" />
						</el-tooltip>
					</div>

					<div class="item" v-if="drag && !browser.isMini" @click="isDrag = true">
						<el-tooltip :content="t('拖動排序')">
							<cl-svg name="sort" />
						</el-tooltip>
					</div>
				</template>
			</div>
		</div>

		<div class="dept-tree__container" @contextmenu.stop.prevent="onContextMenu">
			<el-scrollbar>
				<el-tree
					v-loading="loading"
					node-key="id"
					default-expand-all
					:data="list"
					:props="{
						label: 'name'
					}"
					highlight-current
					:draggable="isDrag"
					:allow-drag="allowDrag"
					:allow-drop="allowDrop"
					:expand-on-click-node="false"
					@node-contextmenu="onContextMenu"
					@node-click="rowClick"
				>
					<template #default="{ node, data }">
						<div class="dept-tree__node">
							<span
								class="dept-tree__node-label"
								:class="{
									'is-active': data.id == ViewGroup?.selected?.id
								}"
								>{{ node.label }}</span
							>
							<span
								v-if="browser.isMini"
								class="dept-tree__node-icon"
								@click="onContextMenu($event, data, node)"
							>
								<el-icon>
									<more-filled />
								</el-icon>
							</span>
						</div>
					</template>
				</el-tree>
			</el-scrollbar>
		</div>

		<cl-form ref="Form" />
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'dept-list'
});

import { nextTick, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCool } from '/@/cool';
import { deepTree, revDeepTree } from '/@/cool/utils';
import { isArray } from 'lodash-es';
import { ContextMenu, useForm } from '@cool-vue/crud';
import { Refresh as RefreshIcon, Operation, MoreFilled } from '@element-plus/icons-vue';
import { checkPerm } from '/$/base';
import { useViewGroup } from '/@/plugins/view';
import { useI18n } from 'vue-i18n';

const props = defineProps({
	drag: {
		type: Boolean,
		default: true
	},
	level: {
		type: Number,
		default: 99
	}
});

const emit = defineEmits(['refresh', 'user-add']);

const { service, browser } = useCool();
const Form = useForm();
const { ViewGroup } = useViewGroup();
const { t } = useI18n();

// 樹形列表
const list = ref<Eps.BaseSysDepartmentEntity[]>([]);

// 載入中
const loading = ref(false);

// 是否能拖動
const isDrag = ref(false);

// 允許託的規則
function allowDrag({ data }: any) {
	return data.parentId;
}

// 允許放的規則
function allowDrop(_: any, dropNode: any) {
	return dropNode.data.parentId;
}

// 重新整理
async function refresh() {
	loading.value = true;
	isDrag.value = false;

	await service.base.sys.department.list().then(res => {
		list.value = deepTree(res);

		if (!ViewGroup.value?.selected) {
			rowClick();
		}
	});

	loading.value = false;
}

// 取得 ids
function rowClick(item?: Eps.BaseSysDepartmentEntity) {
	if (!item) {
		item = list.value[0];
	}

	if (item) {
		const ids = item.children ? revDeepTree(item.children).map(e => e.id) : [];
		ids.unshift(item.id);

		// 選擇
		ViewGroup.value?.select(item);

		nextTick(() => {
			// 重新整理列表
			emit('refresh', { page: 1, departmentIds: ids });
		});
	}
}

// 編輯部門
function rowEdit(item: Eps.BaseSysDepartmentEntity) {
	const method = item.id ? 'update' : 'add';

	Form.value?.open({
		title: t('編輯部門'),
		width: '550px',
		props: {
			labelWidth: '100px'
		},
		items: [
			{
				label: t('部門名稱'),
				prop: 'name',
				component: {
					name: 'el-input'
				},
				required: true
			},
			{
				label: t('上級部門'),
				prop: 'parentName',
				component: {
					name: 'el-input',
					props: {
						disabled: true
					}
				}
			},
			{
				label: t('排序'),
				prop: 'orderNum',
				component: {
					name: 'el-input-number',
					props: {
						'controls-position': 'right',
						min: 0,
						max: 100
					}
				}
			}
		],
		form: {
			...item
		},
		on: {
			submit(data, { done, close }) {
				service.base.sys.department[method]({
					id: item.id,
					parentId: item.parentId,
					name: data.name,
					orderNum: data.orderNum
				})
					.then(() => {
						ElMessage.success(t('新增部門 “{name}” 成功', { name: data.name }));
						close();
						refresh();
					})
					.catch(err => {
						ElMessage.error(err.message);
						done();
					});
			}
		}
	});
}

// 刪除部門
function rowDel(item: Eps.BaseSysDepartmentEntity) {
	async function del(f: boolean) {
		await service.base.sys.department
			.delete({
				ids: [item.id],
				deleteUser: f
			})
			.then(() => {
				// 刪除當前
				if (ViewGroup.value?.selected?.id == item.id) {
					rowClick();
				}

				if (f) {
					ElMessage.success(t('刪除成功'));
				} else {
					ElMessageBox.confirm(
						t('“{name}” 部門的使用者已成功轉移到 “{parentName}” 部門。', {
							name: item.name,
							parentName: item.parentName
						}),
						t('刪除成功')
					);
				}
			});

		refresh();
	}

	ElMessageBox.confirm(
		t('此操作將會刪除 “{name}” 部門的所有使用者，是否確認？', { name: item.name }),
		t('提示'),
		{
			type: 'warning',
			confirmButtonText: t('直接刪除'),
			cancelButtonText: t('保留使用者'),
			distinguishCancelAndClose: true
		}
	)
		.then(() => {
			del(true);
		})
		.catch(action => {
			if (action == 'cancel') {
				del(false);
			}
		});
}

// 部門排序
function treeOrder(f: boolean) {
	if (f) {
		ElMessageBox.confirm(t('部門架構已發生改變，是否儲存？'), t('提示'), {
			type: 'warning'
		})
			.then(async () => {
				const ids: any[] = [];

				function deep(list: any[], pid: any) {
					list.forEach(e => {
						e.parentId = pid;
						ids.push(e);

						if (e.children && isArray(e.children)) {
							deep(e.children, e.id);
						}
					});
				}

				deep(list.value, null);

				await service.base.sys.department
					.order(
						ids.map((e, i) => {
							return {
								id: e.id,
								parentId: e.parentId,
								orderNum: i
							};
						})
					)
					.then(() => {
						ElMessage.success(t('更新排序成功'));
					})
					.catch(err => {
						ElMessage.error(err.message);
					});

				refresh();
				isDrag.value = false;
			})
			.catch(() => null);
	} else {
		refresh();
	}
}

// 右鍵選單
function onContextMenu(e: any, d?: any, n?: any) {
	if (!d) {
		d = list.value[0] || {};
	}

	// 權限
	const perm = service.base.sys.department.permission;

	ContextMenu.open(e, {
		list: [
			{
				label: t('新增'),
				hidden: (n && n.level >= props.level) || !checkPerm(perm.add),
				callback(done) {
					rowEdit({
						name: '',
						parentName: d.name,
						parentId: d.id
					});
					done();
				}
			},
			{
				label: t('編輯'),
				hidden: !checkPerm(perm.update),
				callback(done) {
					rowEdit(d);
					done();
				}
			},
			{
				label: t('刪除'),
				hidden: !d.parentId || !checkPerm(perm.delete),
				callback(done) {
					rowDel(d);
					done();
				}
			},
			{
				label: t('新增成員'),
				hidden: !checkPerm(perm.add),
				callback(done) {
					emit('user-add', d);
					done();
				}
			}
		]
	});
}

onMounted(function () {
	refresh();
});

defineExpose({
	refresh,
	rowClick,
	rowEdit,
	rowDel,
	getList() {
		return list.value;
	}
});
</script>

<style lang="scss" scoped>
.dept-tree {
	height: 100%;
	width: 100%;

	:deep(.el-tree-node__label) {
		display: block;
		height: 100%;
		width: 100%;
	}

	&__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 40px;
		padding: 0 10px;
		border-bottom: 1px solid var(--el-border-color-extra-light);
	}

	&__op {
		display: flex;
		align-items: center;

		.item {
			display: flex;
			justify-content: center;
			align-items: center;
			list-style: none;
			margin-left: 5px;
			cursor: pointer;
			border-radius: 6px;
			font-size: 16px;
			height: 26px;
			width: 26px;
			color: var(--el-text-color-primary);

			.cl-svg {
				outline: none;
			}

			&:hover {
				background-color: var(--el-fill-color-light);
			}
		}

		.btns {
			display: flex;
			align-items: center;
			justify-content: center;

			.item {
				&:hover {
					&:first-child {
						color: var(--el-color-success);
					}

					&:last-child {
						color: var(--el-color-danger);
					}
				}
			}
		}
	}

	&__container {
		height: calc(100% - 40px);
		padding: 10px;

		:deep(.el-tree-node__content) {
			height: 38px;
			border-radius: 4px;

			.el-tree-node__expand-icon {
				margin-left: 5px;
			}
		}
	}

	&__node {
		display: flex;
		align-items: center;
		height: 100%;
		width: 100%;
		box-sizing: border-box;

		&-label {
			display: flex;
			align-items: center;
			flex: 1;
			height: 100%;
			font-size: 14px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;

			&.is-active {
				color: var(--el-color-primary);
			}
		}

		&-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			background-color: #eee;
			height: 26px;
			width: 26px;
			text-align: center;
			margin-right: 5px;
			border-radius: 6px;
		}
	}
}
</style>
