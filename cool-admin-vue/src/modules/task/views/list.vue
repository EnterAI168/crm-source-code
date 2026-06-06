<template>
	<div class="task-list" :class="{ 'is-mini': browser.isMini }">
		<div class="list">
			<div
				v-for="(item, index) in list"
				:key="index"
				class="item"
				@click="edit(item)"
				@contextmenu="
					e => {
						onContextMenu(e, item);
					}
				"
			>
				<p class="name">{{ localeText(item.name) }}</p>
				<p class="row">
					<span>執行服務</span>
					<span>{{ item.service }}</span>
				</p>
				<p class="row">
					<span>定時規則</span>
					<span>{{
						item.taskType == 1
							? `間隔${item._every}秒執行`
							: item.cron
					}}</span>
				</p>

				<div class="status">
					<template v-if="item.status">
						<div
							class="icon"
							@click.stop="stop(item)"
							v-permission="service.task.info.permission.stop"
						>
							<cl-svg name="close-border" />
						</div>

						<el-tag disable-transitions effect="plain" type="success">進行中</el-tag>
					</template>

					<template v-else>
						<div
							class="icon"
							@click.stop="start(item)"
							v-permission="service.task.info.permission.start"
						>
							<cl-svg name="play" />
						</div>

						<el-tag disable-transitions effect="plain" type="danger">已停止</el-tag>
					</template>

					<div class="flex1"></div>

					<div
						class="icon"
						@click.stop="log(item)"
						v-permission="service.task.info.permission.log"
					>
						<cl-svg name="order" />
					</div>

					<div
						class="icon"
						@click.stop="remove(item)"
						v-permission="service.task.info.permission.delete"
					>
						<cl-svg name="delete" />
					</div>
				</div>
			</div>

			<div
				v-permission="service.task.info.permission.add"
				class="item is-add"
				@click="edit()"
			>
				<cl-svg name="plus" :size="36" />
				<p>新增計劃任務</p>
			</div>
		</div>

		<!-- 表單 -->
		<cl-form ref="Form" />

		<!-- 日誌 -->
		<task-logs :ref="setRefs('log')" />
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'task-list'
});

import { onActivated, ref } from 'vue';
import { useBrowser, useCool } from '/@/cool';
import { VideoPlay, VideoPause, Plus, Tickets, Delete } from '@element-plus/icons-vue';
import { ContextMenu, useForm } from '@cool-vue/crud';
import { ElMessage, ElMessageBox } from 'element-plus';
import TaskLogs from '../components/logs.vue';
import { useI18n } from 'vue-i18n';
import { localeText } from '/@/utils/localeText';

const { service, refs, setRefs } = useCool();
const { browser } = useBrowser();
const Form = useForm();
const { t } = useI18n();

const list = ref<Eps.TaskInfoEntity[]>([]);

// 重新整理
function refresh() {
	service.task.info.page({ size: 100, page: 1 }).then(res => {
		list.value = res.list.map(e => {
			if (e.every) {
				e._every = parseInt(String(e.every / 1000));
			}

			return e;
		});
	});
}

// 啟用任務
function start(item: Eps.TaskInfoEntity) {
	ElMessageBox.confirm(t('此操作將啟用任務（{name}），是否繼續？', { name: item.name }), '提示', {
		type: 'warning'
	})
		.then(() => {
			service.task.info
				.start({ id: item.id, type: item.type })
				.then(() => {
					refresh();
				})
				.catch(err => {
					ElMessage.error(err.message);
				});
		})
		.catch(() => null);
}

// 停用任務
function stop(item: Eps.TaskInfoEntity) {
	ElMessageBox.confirm(t('此操作將停用任務（{name}），是否繼續？', { name: item.name }), '提示', {
		type: 'warning'
	})
		.then(() => {
			service.task.info
				.stop({ id: item.id })
				.then(() => {
					refresh();
				})
				.catch(err => {
					ElMessage.error(err.message);
				});
		})
		.catch(() => null);
}

// 刪除任務
function remove(item: Eps.TaskInfoEntity) {
	ElMessageBox.confirm(t('此操作將刪除任務（{name}），是否繼續？', { name: item.name }), '提示', {
		type: 'warning'
	})
		.then(() => {
			service.task.info
				.delete({ ids: [item.id] })
				.then(() => {
					refresh();
				})
				.catch(err => {
					ElMessage.error(err.message);
				});
		})
		.catch(() => null);
}

// 任務日誌
function log(item: Eps.TaskInfoEntity) {
	refs.log.open(item);
}

// 新增、編輯
async function edit(item?: Eps.TaskInfoEntity) {
	if (item && !service.task.info._permission.update) {
		return false;
	}

	Form.value?.open({
		title: t('編輯計劃任務'),
		width: '600px',
		props: {
			labelWidth: '80px'
		},
		items: [
			{
				label: t('名稱'),
				prop: 'name',
				component: {
					name: 'el-input',
					props: {
						placeholder: '請輸入名稱'
					}
				},
				required: true
			},
			{
				label: t('型別'),
				prop: 'taskType',
				value: 0,
				component: {
					name: 'el-radio-group',
					options: [
						{
							label: 'cron',
							value: 0
						},
						{
							label: t('時間間隔'),
							value: 1
						}
					]
				},
				required: true
			},
			{
				label: 'cron',
				prop: 'cron',
				hidden: ({ scope }) => scope.taskType == 1,
				component: {
					name: 'el-input',
					props: {
						placeholder: '* * * * * *'
					}
				},
				required: true
			},
			{
				label: t('間隔(秒)'),
				prop: 'every',
				hidden: ({ scope }) => scope.taskType == 0,
				hook: {
					bind(value) {
						return value / 1000;
					},
					submit(value) {
						return value * 1000;
					}
				},
				component: {
					name: 'el-input-number',
					props: {
						min: 1,
						max: 100000000
					}
				},
				required: true
			},
			{
				label: 'service',
				prop: 'service',
				component: {
					name: 'el-input',
					props: {
						placeholder: 'taskDemoService.test([1, 2])'
					}
				}
			},
			{
				label: t('開始時間'),
				prop: 'startDate',
				hidden: ({ scope }) => scope.taskType == 1,
				component: {
					name: 'el-date-picker',
					props: {
						type: 'datetime',
						'value-format': 'YYYY-MM-DD HH:mm:ss'
					}
				}
			},
			{
				label: t('備註'),
				prop: 'remark',
				component: {
					name: 'el-input',
					props: {
						type: 'textarea',
						rows: 3
					}
				}
			}
		],
		form: {
			...item
		},
		on: {
			submit: (data, { close, done }) => {
				if (!data.limit) {
					data.limit = null;
				}

				service.task.info[item?.id ? 'update' : 'add'](data)
					.then(() => {
						refresh();
						ElMessage.success(t('儲存成功'));
						close();
					})
					.catch(err => {
						ElMessage.error(err.message);
						done();
					});
			}
		}
	});
}

// 執行一次
function once(item: Eps.TaskInfoEntity) {
	service.task.info
		.once({ id: item.id })
		.then(() => {
			refresh();
		})
		.catch(err => {
			ElMessage.error(err.message);
		});
}

// 右鍵選單
function onContextMenu(e: any, item: Eps.TaskInfoEntity) {
	ContextMenu.open(e, {
		list: [
			item.status
				? {
						label: t('暫停'),
						hidden: !service.task.info._permission.stop,
						callback(done) {
							stop(item);
							done();
						}
					}
				: {
						label: t('開始'),
						hidden: !service.task.info._permission.start,
						callback(done) {
							start(item);
							done();
						}
					},
			{
				label: t('立即執行'),
				hidden: !service.task.info._permission.once,
				callback(done) {
					once(item);
					done();
				}
			},
			{
				label: t('編輯'),
				hidden: !(
					service.task.info._permission.update && service.task.info._permission.info
				),
				callback(done) {
					edit(item);
					done();
				}
			},
			{
				label: t('刪除'),
				hidden: !service.task.info._permission.delete,
				callback(done) {
					remove(item);
					done();
				}
			},
			{
				label: t('檢視日誌'),
				hidden: !service.task.info._permission.log,
				callback(done) {
					log(item);
					done();
				}
			}
		]
	});
}

onActivated(() => {
	refresh();
});
</script>

<style lang="scss" scoped>
.task-list {
	height: 100%;

	.list {
		display: flex;
		flex-wrap: wrap;

		.item {
			background-color: var(--el-bg-color);
			padding: 15px 20px 0 20px;
			border-radius: 10px;
			margin: 0 10px 10px 0;
			height: 200px;
			width: 350px;
			cursor: pointer;
			box-sizing: border-box;

			.name {
				font-size: 16px;
				font-weight: bold;
				margin-bottom: 10px;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
			}

			.row {
				margin-bottom: 10px;
				height: 40px;

				span {
					display: block;
					font-size: 12px;

					&:nth-child(1) {
						margin-bottom: 5px;
						color: var(--el-color-info);
					}
				}
			}

			.status {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-top: 15px;

				.flex1 {
					flex: 1;
				}

				.icon {
					font-size: 16px;
					cursor: pointer;
					border-radius: 6px;
					height: 28px;
					width: 28px;
					display: flex;
					align-items: center;
					justify-content: center;
					margin-right: 10px;
					background-color: var(--el-border-color-lighter);
					color: var(--el-text-color-primary);

					&:hover {
						background-color: var(--el-border-color-light);
					}

					&:last-child {
						margin-right: 0;
					}
				}
			}

			&:hover {
				box-shadow: 0px 0px 10px 1px var(--el-color-info-light-9);
			}

			&.is-add {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				color: var(--el-color-info);

				p {
					font-size: 13px;
					margin: 20px 0;
				}
			}
		}
	}

	&.is-mini {
		.item {
			width: 100%;
			margin: 0 0 15px 0;
		}
	}
}
</style>
