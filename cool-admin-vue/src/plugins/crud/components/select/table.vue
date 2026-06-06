<template>
	<div class="cl-select-table__picker">
		<template v-if="pickerType == 'table'">
			<template v-if="multiple">
				<div class="mb-[10px]">
					<el-button type="success" @click="open">{{ $t('新增') }}</el-button>
					<el-button
						type="danger"
						:disabled="refs.table?.selection.length == 0"
						@click="remove()"
					>
						{{ $t('移除') }}
					</el-button>
				</div>

				<cl-crud padding="0">
					<cl-row>
						<cl-table :ref="setRefs('table')" :data="data" :auto-height="false" />
					</cl-row>

					<cl-row type="flex" align="middle" justify="end">
						<el-pagination
							v-model:current-page="pager.page"
							:page-size="pager.size"
							:total="list.length"
							background
							layout="total, prev, pager, next, jumper"
						/>
					</cl-row>
				</cl-crud>
			</template>
		</template>

		<template v-else>
			<div class="cl-select-table__picker-inner" @click="open">
				<span v-if="isEmpty(data)" class="placeholder">{{
					placeholder || $t('請選擇')
				}}</span>

				<template v-else>
					<template v-for="(item, index) in data" :key="index">
						<slot name="item" :item="item" :index="index">
							<template v-if="pickerType == 'default'">
								<cl-image
									:src="item[dict.img]"
									:size="24"
									:radius="5"
									:preview="false"
									class="mr-[5px]"
								/>
								<span v-if="!multiple">{{ item[dict.text] }}</span>
							</template>

							<template v-else-if="pickerType == 'text'">
								<el-tag
									disable-transitions
									size="small"
									effect="plain"
									v-if="multiple"
								>
									{{ item[dict.text] }}
								</el-tag>

								<span v-else>{{ item[dict.text] }}</span>
							</template>
						</slot>
					</template>
				</template>

				<el-icon v-if="!isEmpty(data)" @click.stop="remove()">
					<circle-close />
				</el-icon>
			</div>
		</template>
	</div>

	<cl-dialog v-model="visible" width="1200px" :title="title">
		<cl-crud ref="Crud" padding="0">
			<cl-row>
				<!-- 重新整理按鈕 -->
				<cl-refresh-btn />

				<!-- 全選 -->
				<el-button v-if="multiple" type="primary" @click="selectAll">{{
					$t('全選')
				}}</el-button>

				<cl-flex1 />
				<!-- 條件搜尋 -->
				<cl-search ref="Search" />
			</cl-row>

			<cl-row>
				<!-- 資料表格 -->
				<cl-table ref="Table" :auto-height="false" @selection-change="onSelectionChange">
					<template #column-check="{ scope }">
						<el-button
							v-if="selection[0]?.[dict.id] == scope.row[dict.id]"
							type="success"
							disabled
						>
							{{ $t('已選') }}
						</el-button>
						<el-button v-else @click="select(scope.row)">{{ $t('選擇') }}</el-button>
					</template>
				</cl-table>
			</cl-row>

			<cl-row>
				<span v-if="multiple">{{ $t('已選') }} {{ selection.length }} {{ $t('人') }}</span>
				<cl-flex1 />
				<!-- 分頁控制元件 -->
				<cl-pagination />
			</cl-row>
		</cl-crud>

		<template #footer>
			<el-button @click="close">{{ $t('取消') }}</el-button>
			<el-button
				v-if="multiple"
				type="success"
				:disabled="isEmpty(selection)"
				@click="select()"
			>
				{{ $t('選擇') }}
			</el-button>
		</template>
	</cl-dialog>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'cl-select-table'
});

import { useI18n } from 'vue-i18n';
import { useCrud, useForm, useSearch, useTable } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { type PropType, computed, nextTick, reactive, ref, watch } from 'vue';
import { cloneDeep, isArray, isEmpty, merge } from 'lodash-es';
import { CircleClose } from '@element-plus/icons-vue';
import { CrudProps } from '../../comm';

const { t } = useI18n();

// 替換你的型別
type Item = {
	id?: string | number;
	nickName?: string;
	avatarUrl?: string;
	headImg?: string;
	name?: string;
	[key: string]: any;
};

// 字典
type Dict = {
	id: string;
	img: string;
	text: string;
};

const props = defineProps({
	...CrudProps,
	modelValue: null,
	scope: Object as PropType<Item>,
	// 標題
	title: String,
	// 請選擇
	placeholder: String,
	// 請求服務
	service: null,
	// 顯示選擇器
	showPicker: {
		type: Boolean,
		default: true
	},
	// 選擇器型別
	pickerType: {
		type: String as PropType<'default' | 'text' | 'table'>,
		default: 'default'
	},
	// 字典
	dict: Object as PropType<Dict>,
	// 是否多選
	multiple: {
		type: Boolean,
		default: true
	},
	// 列
	columns: {
		type: Array as PropType<ClTable.Column[]>,
		default: () => []
	}
});

const emit = defineEmits(['update:modelValue']);

const { refs, setRefs } = useCool();

// 字典
const dict = merge(
	{
		id: 'id',
		img: 'avatarUrl',
		text: 'nickName'
	},
	props.dict
);

// 上級表單
const Form = useForm();

// cl-table
const Table = useTable({
	contextMenu: ['refresh', 'order-desc', 'order-asc'],
	columns: [
		props.multiple
			? {
					type: 'selection',
					width: 60,
					reserveSelection: true
				}
			: {
					label: t('操作'),
					prop: 'check',
					width: 100
				},
		...props.columns
	]
});

// cl-search
const Search = useSearch();

// cl-crud
const Crud = useCrud({
	service: props.service,
	async onRefresh(params, { next }) {
		const res = await next(params);

		// 新增已載入列表的 id
		loadIds.value.push(...res.list.map(e => e[dict.id]));

		// 資料反選
		selection.value.forEach(e => {
			const d = Table.value?.data.find(a => a[dict.id] == e[dict.id]);

			if (d) {
				Table.value?.toggleRowSelection(d, true);
			}
		});
	}
});

// 重新整理
async function refresh(params?: any) {
	return Crud.value?.refresh(params);
}

// 彈窗是否可見
const visible = ref(false);

// 已選的資料列表，雙向繫結用
const list = ref<Item[]>([]);

// 已選列表
const selection = ref<Item[]>([]);

// 分頁
const pager = reactive({
	page: 1,
	size: 10
});

// 資料列表
const data = computed(() => {
	if (props.pickerType == 'table') {
		const { page, size } = pager;
		return list.value.slice((page - 1) * size, page * size);
	} else {
		return list.value;
	}
});

// 已載入列表的 id
const loadIds = ref<number[]>([]);

// 監聽已選列表
function onSelectionChange(arr: Item[]) {
	// 已載入的
	const ids = Array.from(new Set(loadIds.value));

	// 過濾掉已載入的，再加上已選的
	selection.value = selection.value.filter(e => !ids.includes(e[dict.id]!)).concat(...arr);
}

// 開啟選擇彈窗
function open() {
	visible.value = true;

	// 清空資料
	loadIds.value = [];

	// 設定已選
	selection.value = cloneDeep(list.value);

	nextTick(() => {
		refresh({
			size: 10
		});
	});
}

// 關閉選擇彈窗
function close() {
	visible.value = false;
}

// 設定值
function set(data: Item[] | Item) {
	list.value = cloneDeep(isArray(data) ? data : [data]);
}

// 選擇
function select(item?: Item) {
	// 單選不觸發 onSelectionChange 手動設定
	if (item) {
		selection.value = [item];
	}

	list.value = cloneDeep(selection.value || []);

	close();
}

// 全選
async function selectAll() {
	// 全部資料
	await Crud.value?.refresh({ page: 1, size: 10000 }).then(res => {
		list.value = res.list;
	});

	close();
}

// 移除
function remove() {
	if (props.pickerType == 'table') {
		const ids = ((refs.table?.selection || []) as any[]).map(e => e[dict.id]);

		list.value = list.value.filter(e => {
			// 清空選擇狀態
			refs.table?.toggleRowSelection(e, false);

			// 移除已選的
			return !ids.find(id => id == e[dict.id]);
		});
	} else {
		list.value = [];
	}
}

// 監聽已選列表，返回 ids/id
watch(
	list,
	(arr = []) => {
		const ids = arr.map(e => e[dict.id]);

		if (props.multiple) {
			emit('update:modelValue', ids);
		} else {
			emit('update:modelValue', ids[0]);
		}

		Form.value?.validateField(props.prop);
	},
	{
		deep: true
	}
);

defineExpose({
	set,
	remove,
	select,
	selectAll
});
</script>

<style lang="scss" scoped>
.cl-select-table__picker {
	&-inner {
		display: flex;
		align-items: center;
		box-shadow: 0 0 0 1px var(--el-border-color) inset;
		border-radius: var(--el-border-radius-base);
		padding: 0 11px;
		padding-right: 40px;
		min-height: 32px;
		cursor: pointer;
		position: relative;
		background-color: var(--el-bg-color);
		transition: var(--el-transition-duration);

		.cl-avatar {
			margin-right: 6px;
		}

		.el-tag {
			margin: 2px 5px 2px 0;
		}

		.el-icon,
		.placeholder {
			color: var(--el-text-color-placeholder);
		}

		.el-icon {
			position: absolute;
			right: 10px;
		}

		.placeholder {
			color: var(--el-text-color-placeholder);
		}

		&:hover {
			box-shadow: 0 0 0 1px var(--el-text-color-disabled) inset;
		}
	}
}
</style>
