<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>event</el-tag>
			<span>開啟、關閉、提交等事件</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['upsert/event.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="事件" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<!-- 開啟新增表單的按鈕 -->
						<cl-add-btn />
					</cl-row>

					<cl-row>
						<cl-table ref="Table" />
					</cl-row>

					<cl-row>
						<cl-flex1 />
						<cl-pagination />
					</cl-row>

					<!--【很重要】新增、編輯的表單元件 -->
					<cl-upsert ref="Upsert" />
				</cl-crud>
			</cl-dialog>
		</div>

		<div class="f">
			<span class="date">2024-01-01</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { ref } from 'vue';
import { useDict } from '/$/dict';
import { useCool } from '/@/cool';

const { service } = useCool();
const { dict } = useDict();

// cl-crud 配置
const Crud = useCrud(
	{
		service: 'test'
	},
	app => {
		app.refresh();
	}
);

// cl-table 配置
const Table = useTable({
	autoHeight: false,
	contextMenu: ['refresh'],

	columns: [
		{
			label: '姓名',
			prop: 'name',
			minWidth: 140
		},
		{
			label: '手機號碼',
			prop: 'phone',
			minWidth: 140
		},
		{
			label: '工作',
			prop: 'occupation',
			dict: dict.get('occupation'),
			minWidth: 140
		},
		{
			label: '建立時間',
			prop: 'createTime',
			minWidth: 170,
			sortable: 'desc'
		},
		{
			type: 'op',
			// edit 開啟編輯表單
			buttons: ['edit', 'delete']
		}
	]
});

// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		{
			label: '姓名',
			prop: 'name',
			component: {
				name: 'el-input'
			}
		},
		{
			label: '手機號碼',
			prop: 'phone',
			component: {
				name: 'el-input'
			}
		},
		{
			label: '工作',
			prop: 'occupation',
			component: {
				name: 'cl-select',
				props: {
					tree: true,
					checkStrictly: true,
					options: dict.get('occupation')
				}
			}
		}
	],

	// 以下事件按順序觸發

	// 彈窗開啟的事件，這個時候還未有表單資料
	onOpen() {
		console.log('onOpen');
	},

	// 取得詳情，編輯的時候會觸發
	async onInfo(data, { next, done }) {
		// 不配置 onInfo 的時候預設執行 next(data)，呼叫 service 的 info 介面取得詳情
		// next(data);

		// 自定義，需要對請求資料進行處理或者返回處理後的資料
		const res = await next({
			id: data.id
		});

		done({
			...res,
			name: `[${res.name}]`
		});
	},

	// 彈窗開啟後，已經得到了表單資料
	onOpened(data) {
		// 判定是否編輯模式
		if (Upsert.value?.mode == 'update') {
			// 對資料處理
			data.phone += '000';
		}
	},

	// 提交事件的鉤子
	// data 表單提交資料
	// next 繼續往下執行
	// done 關閉載入
	// close 關閉彈窗
	async onSubmit(data, { next, done, close }) {
		// 不配置 onSubmit 的時候預設執行 next(data)，提交後會去請求 service 的 update/add 介面
		// next(data);

		// 自定義如下
		// 場景1：提交時對參數額外的處理
		// next({
		// 	...data,
		// 	status: 1,
		// 	createTime: dayjs().format("YYYY-MM-DD")
		// });

		// 場景2：提交前、後的操作
		// 之前，模擬取得 userId
		const userId = await service.base.sys.user.info({ id: 1 });

		// 返回值
		const res = await next({
			userId,
			data
		});

		// 之後
		// console.log(res);
	},

	// 關閉時觸發
	onClose(action, done) {
		// action 關閉的型別
		console.log('action，', action);

		// 使用 done 關閉視窗
		done();
	},

	// 關閉後觸發
	onClosed() {
		console.log('onClosed');
	}
});

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
