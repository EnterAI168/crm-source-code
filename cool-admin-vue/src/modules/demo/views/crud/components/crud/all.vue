<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>all</el-tag>
			<span>完整示例</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['crud/all.vue']" />

			<cl-dialog v-model="visible" title="完整示例" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<!-- 重新整理按鈕 -->
						<cl-refresh-btn />

						<!-- 新增按鈕 -->
						<cl-add-btn />

						<!-- 批次刪除按鈕 -->
						<cl-multi-delete-btn />

						<!-- 篩選 -->
						<cl-filter label="狀態篩選">
							<!-- 配置prop，選擇後會自動過濾列表 -->
							<cl-select :options="options.status" prop="status" :width="120" />
						</cl-filter>

						<!-- 字典 -->
						<cl-filter label="工作（字典）">
							<cl-select
								tree
								:options="dict.get('occupation')"
								prop="occupation"
								:width="140"
								check-strictly
							/>
						</cl-filter>

						<cl-flex1 />

						<!-- 匯入 -->
						<cl-import-btn template="/使用者匯入模版.xlsx" />

						<!-- 匯出 -->
						<cl-export-btn :columns="Table?.columns" />

						<!-- 自定義列 -->
						<cl-column-custom
							:ref="setRefs('columnCustom')"
							:columns="Table?.columns"
						/>

						<!-- 關鍵字搜尋 -->
						<cl-search-key placeholder="搜尋姓名、手機號" :width="250" />

						<!-- 高階搜尋按鈕 -->
						<cl-adv-btn />
					</cl-row>

					<cl-row>
						<!-- 表格 -->
						<cl-table
							ref="Table"
							show-summary
							:summary-method="onSummaryMethod"
							:auto-height="false"
						>
							<!-- 展開資訊 -->
							<template #column-detail="{ scope }">
								<div style="padding: 0 10px">
									<el-descriptions border :column="3">
										<el-descriptions-item label="ID">
											{{ scope.row.id }}
										</el-descriptions-item>

										<el-descriptions-item label="姓名">
											{{ scope.row.name }}
										</el-descriptions-item>

										<el-descriptions-item label="存款">
											{{ scope.row.wages }}
										</el-descriptions-item>

										<el-descriptions-item label="出生年月">
											{{ scope.row.createTime }}
										</el-descriptions-item>
									</el-descriptions>
								</div>
							</template>

							<!-- 自定義列 -->
							<template #column-wages="{ scope }">
								<span>{{ scope.row.wages }}🤑</span>
							</template>
						</cl-table>
					</cl-row>

					<cl-row>
						<cl-flex1 />

						<!-- 分頁 -->
						<cl-pagination />
					</cl-row>

					<!-- 新增、編輯 -->
					<cl-upsert ref="Upsert" />

					<!-- 高階搜尋 -->
					<cl-adv-search ref="AdvSearch" />
				</cl-crud>
			</cl-dialog>
		</div>

		<div class="f">
			<span class="date">2024-01-01</span>
		</div>
	</div>
</template>

<script lang="tsx" setup>
defineOptions({
	name: 'demo-crud'
});

import { useCrud, useUpsert, useTable, useAdvSearch, useSearch } from '@cool-vue/crud';
import { useDict } from '/$/dict';
import { reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCool } from '/@/cool';

// 基礎
const { service, refs, setRefs } = useCool();

// 字典
const { dict } = useDict();

// 選項，統一命名options，存放所有的下拉等其他選項列表資料
const options = reactive({
	status: [
		{
			label: '啟用',
			value: 1
		},
		{
			label: '停用',
			type: 'danger',
			value: 0
		}
	]
});

// 合計資料
const subData = reactive({
	wages: 0
});

// crud
const Crud = useCrud(
	{
		// 繫結的服務，如：service.demo.goods、service.base.sys.user
		service: 'test',

		// 重新整理事件
		async onRefresh(params, { next }) {
			const res = await next(params);
			Object.assign(subData, res.subData);
		}
	},
	app => {
		// Crud 載入完，預設重新整理一次
		app.refresh({
			size: 10
			// status: 1 // 帶額外參數的請求
		});
	}
);

// 重新整理列表，統一呼叫這個方法去重新整理
function refresh(params?: any) {
	Crud.value?.refresh(params);
}

// 新增、編輯
// 插入型別 <Eps.UserInfoEntity>，prop 和 data 會有提示
const Upsert = useUpsert<Eps.UserInfoEntity>({
	items: [
		// 分組
		{
			type: 'tabs',
			props: {
				type: 'card',
				labels: [
					{
						label: '基礎資訊',
						value: 'base'
					},
					{
						label: '其他配置',
						value: 'other'
					}
				]
			}
		},
		{
			label: '頭像',
			prop: 'avatarUrl',
			group: 'base',
			component: {
				name: 'cl-upload'
			}
		},
		{
			label: '賬號',
			group: 'base',
			prop: 'account',
			component: {
				name: 'el-input'
			}
		},
		// 動態配置，新增顯示、編輯隱藏
		() => {
			return () => {
				return {
					label: '密碼',
					group: 'base',
					prop: 'password',
					hidden: Upsert.value?.mode == 'update', // 通過 mode 參數判斷
					component: {
						name: 'el-input',
						props: {
							type: 'password'
						}
					}
				};
			};
		},
		{
			group: 'base',
			prop: 'user',
			component: {
				name: 'cl-form-card',
				props: {
					label: '使用者資訊（多層級展示）'
				}
			},
			children: [
				{
					label: '姓名',
					prop: 'name',
					required: true,
					component: {
						name: 'el-input'
					}
				},
				{
					label: '存款',
					prop: 'wages',
					component: {
						name: 'el-input-number'
					}
				}
			]
		},
		{
			group: 'base',
			prop: 'contact',
			component: {
				name: 'cl-form-card',
				props: {
					label: '聯絡資訊',
					expand: false
				}
			},
			children: [
				{
					label: '手機號',
					prop: 'phone',
					component: {
						name: 'el-input'
					}
				},
				{
					label: '省市區',
					prop: 'pca',
					group: 'base',
					component: {
						name: 'cl-distpicker'
					}
				}
			]
		},
		{
			group: 'other',
			label: '工作',
			prop: 'occupation',
			component: {
				name: 'el-tree-select',
				props: {
					data: dict.get('occupation'),
					checkStrictly: true
				}
			}
		},
		{
			group: 'other',
			label: '身份證照片',
			prop: 'idCardPic',
			component: {
				name: 'cl-upload',
				props: {
					isSpace: true,
					size: [200, 300]
				}
			}
		}
	],

	// 詳情鉤子
	onInfo(data, { next, done }) {
		// 繼續請求 info 介面，可以帶其他自定義參數
		// next({
		// 	id: data.id,
		//	status: 1
		// });

		// 使用其他介面
		// service.demo.goods.info({ id: data.id }).then((res) => {
		// 	done(res);
		// });

		// 直接取列表的資料返回
		done(data);
	},

	// 提交鉤子
	onSubmit(data, { next, close, done }) {
		console.log('onSubmit', data);
		// 繼續請求 update/add 介面
		next(data);

		// 自定義介面
		// service.demo.goods
		// 	.update(data)
		// 	.then(() => {
		// 		ElMessage.success("儲存成功");

		// 		// 操作完，重新整理列表
		// 		refresh();

		// 		// 關閉視窗
		// 		close();
		// 	})
		// 	.catch((err) => {
		// 		ElMessage.error(err.message);

		// 		// 關閉載入狀態
		// 		done();
		// 	});
	},

	// 開啟後，資料載入完，onInfo 之後
	onOpened(data) {
		if (Upsert.value?.mode != 'info') {
			ElMessage.info('編輯中');
		}
	},

	// 關閉鉤子
	onClose(action, done) {
		if (Upsert.value?.mode == 'update') {
			if (action == 'close') {
				return ElMessageBox.confirm('還沒填完，確定關閉不？', '提示', {
					type: 'warning'
				})
					.then(() => {
						done();
						ElMessage.info('好吧');
					})
					.catch(() => {
						ElMessage.success('請繼續編輯');
					});
			}
		}

		done();
	}
});

// 表格
const Table = useTable({
	columns: [
		{
			type: 'selection',
			width: 60
		},
		// 展開列
		{
			label: '展開',
			type: 'expand',
			prop: 'detail',
			width: 60
		},
		{
			label: '頭像',
			prop: 'avatar',
			width: 100,
			component: {
				name: 'cl-image',
				props: {
					size: 40
				}
			}
		},
		{
			label: '姓名',
			prop: 'name',
			minWidth: 120
		},
		{
			label: '手機號',
			prop: 'phone',
			minWidth: 140,

			// 帶搜尋元件
			search: {
				component: {
					name: 'el-input',
					props: {
						placeholder: '搜尋手機號'
					}
				}
			}
		},
		{
			label: '賬號',
			prop: 'account',
			minWidth: 150
		},
		{
			label: '存款(元)',
			prop: 'wages',
			minWidth: 150,
			sortable: 'desc' // 預設倒序
		},
		{
			label: '工作',
			prop: 'occupation',
			dict: dict.get('occupation'),
			dictColor: true,
			minWidth: 150,
			dictAllLevels: true, // 顯示所有等級

			// 帶搜尋元件
			search: {
				component: {
					name: 'cl-select',
					props: {
						options: dict.get('occupation')
					}
				}
			}
		},
		{
			label: '狀態',
			orderNum: 2,
			prop: 'status',
			minWidth: 100,
			component: {
				name: 'cl-switch'
			}
		},
		{
			label: '出生年月',
			orderNum: 1,
			minWidth: 165,
			prop: 'createTime',
			sortable: 'custom',
			search: {
				component: {
					name: 'cl-date-picker',
					props: {
						type: 'date',
						valueFormat: 'YYYY-MM-DD',
						placeholder: '搜尋日期'
					}
				}
			}
		},
		{
			type: 'op',
			width: 340,
			// 靜態配置按鈕
			// buttons: ["info", "edit", "delete"],
			// 動態配置按鈕
			buttons({ scope }) {
				return [
					'info',
					'edit',
					'delete',
					{
						label: '自定義',
						onClick() {
							ElMessage.info(`他是：${scope.row.name}`);
						}
					}
				];
			}
		}
	]
});

// 合計
function onSummaryMethod() {
	// 新增自定義列元件後
	return ['合計', '', ...refs.columnCustom.summary(subData)];
}

// 高階搜尋
const AdvSearch = useAdvSearch({
	items: [
		{
			label: '姓名',
			prop: 'name',
			component: {
				name: 'el-input',
				props: {
					clearable: true
				}
			}
		},
		{
			label: '手機號',
			prop: 'phone',
			component: {
				name: 'el-input',
				props: {
					clearable: true
				}
			}
		},
		{
			label: '工作',
			prop: 'occupation',
			hook: {
				bind: 'string'
			},
			component: {
				name: 'el-select',
				options: dict.get('occupation')
			}
		}
	]
});

// 搜尋
const Search = useSearch({
	items: [
		{
			label: '姓名',
			prop: 'name',
			component: {
				name: 'el-input',
				props: {
					clearable: true
				}
			}
		}
	]
});

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
