<template>
	<div class="app-topbar">
		<div class="cl-comm__icon mr-[10px]" @click="app.fold()">
			<cl-svg name="fold" v-if="app.isFold" />
			<cl-svg name="expand" v-else />
		</div>

		<!-- 路由導航 -->
		<a-menu v-if="app.info.menu.isGroup" />
		<route-nav v-else />

		<div class="flex1"></div>

		<!-- 工具欄 -->
		<ul class="app-topbar__tools">
			<li>
				<el-popover
					v-model:visible="reminder.visible"
					placement="bottom-end"
					width="560"
					trigger="click"
					@show="openReminders"
				>
					<template #reference>
						<el-badge :value="reminder.unreadCount" :hidden="reminder.unreadCount <= 0" :max="99">
							<div class="cl-comm__icon">
								<el-icon><Bell /></el-icon>
							</div>
						</el-badge>
					</template>

					<div class="contract-reminder">
						<div class="contract-reminder__head">
							<span>合約回傳提醒</span>
							<el-button
								v-if="reminder.rows.length"
								type="primary"
								link
								@click="markAllRemindersRead"
							>
								全部已讀
							</el-button>
						</div>
						<el-empty v-if="!reminder.rows.length" description="暫無提醒" :image-size="80" />
						<div v-else class="contract-reminder__list">
							<div
								v-for="item in reminder.rows"
								:key="item.id"
								class="contract-reminder__item"
								:class="{ 'is-unread': Number(item.isRead) === 0 }"
							>
								<div class="contract-reminder__content">{{ localeText(item.content) }}</div>
								<div class="contract-reminder__meta">{{ item.notifyDate }}</div>
								<div class="contract-reminder__quotes">
									<div
										v-for="quote in normalizeReminderQuotes(item.detailJson)"
										:key="quote.quoteOrderId"
										class="contract-reminder__quote"
									>
										<span>{{ localeText(quote.quoteName || quote.quoteNo || '--') }}</span>
										<el-tag
											size="small"
											:type="Number(quote.leftDays) < 0 ? 'danger' : 'warning'"
											effect="plain"
										>
											{{ localeText(quote.status || (Number(quote.leftDays) < 0 ? '已逾期' : '待回傳')) }}
										</el-tag>
									</div>
								</div>
							</div>
						</div>
						<div class="contract-reminder__foot">
							<el-button type="primary" link @click="toQuoteList">檢視報價單</el-button>
						</div>
					</div>
				</el-popover>
			</li>
			<li v-for="(item, index) in toolbarComponents" :key="index">
				<component :is="item.component" />
			</li>
		</ul>

		<!-- 使用者資訊 -->
		<template v-if="user.info">
			<el-dropdown
				hide-on-click
				popper-class="app-topbar__user-popper"
				:popper-options="{}"
				@command="onCommand"
			>
				<div class="app-topbar__user">
					<el-text class="mr-[10px]">{{ localeText(user.info.name || user.info.username) }}</el-text>
					<cl-avatar :size="26" :src="user.info.headImg" />
				</div>

				<template #dropdown>
					<div class="user">
						<cl-avatar :size="34" :src="user.info.headImg" />

						<div class="det">
							<el-text size="small" tag="p">{{ localeText(user.info.name || user.info.username) }}</el-text>
							<el-text size="small" type="info">{{ user.info.email }}</el-text>
						</div>
					</div>

					<el-dropdown-menu>
						<el-dropdown-item command="my">
							<cl-svg name="my" />
							<span>{{ t('個人中心') }}</span>
						</el-dropdown-item>
						<el-dropdown-item command="exit">
							<cl-svg name="exit" />
							<span>{{ t('退出登入') }}</span>
						</el-dropdown-item>
					</el-dropdown-menu>
				</template>
			</el-dropdown>
		</template>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'app-topbar'
});

import { computed, markRaw, onMounted, reactive } from 'vue';
import { isFunction, orderBy } from 'lodash-es';
import { checkPerm, useBase } from '/$/base';
import { module, useCool } from '/@/cool';
import { ElMessageBox } from 'element-plus';
import { Bell } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import RouteNav from './route-nav.vue';
import AMenu from './amenu.vue';
import ContractReminderService from '/$/customer/service/contractReminder';
import { localeText } from '/@/utils/localeText';

const { router, service, browser } = useCool();
const { user, app } = useBase();
const { t } = useI18n();
const contractReminderService = new ContractReminderService();
const canViewContractReminder = computed(() =>
	checkPerm({
		or: ['crm:quoteOrder:page', 'crm:customerList:page', 'crm:performance:page']
	})
);

const reminder = reactive({
	visible: false,
	unreadCount: 0,
	rows: [] as any[],
	loading: false
});

// 命令事件
async function onCommand(name: string) {
	switch (name) {
		case 'my':
			router.push('/my/info');
			break;
		case 'exit':
			ElMessageBox.confirm(t('確定退出登入嗎？'), t('提示'), {
				type: 'warning'
			})
				.then(async () => {
					await service.base.comm.logout();
					user.logout();
				})
				.catch(() => null);
			break;
	}
}

async function loadReminderCount() {
	if (!canViewContractReminder.value) {
		reminder.unreadCount = 0;
		return;
	}
	try {
		const res: any = await contractReminderService.unreadCount();
		reminder.unreadCount = Number(res?.count || 0);
	} catch {
		reminder.unreadCount = 0;
	}
}

async function openReminders() {
	if (!canViewContractReminder.value) {
		reminder.rows = [];
		return;
	}
	reminder.loading = true;
	try {
		const res: any = await contractReminderService.page({ page: 1, size: 5 });
		reminder.rows = Array.isArray(res?.list) ? res.list : [];
	} finally {
		reminder.loading = false;
	}
}

async function markAllRemindersRead() {
	if (!canViewContractReminder.value) {
		return;
	}
	await contractReminderService.markRead({});
	await loadReminderCount();
	await openReminders();
}

function normalizeReminderQuotes(value: any) {
	if (Array.isArray(value)) {
		return value;
	}
	if (typeof value === 'string') {
		try {
			const list = JSON.parse(value);
			return Array.isArray(list) ? list : [];
		} catch {
			return [];
		}
	}
	return [];
}

function toQuoteList() {
	reminder.visible = false;
	router.push('/crm/quote/list');
}

// 工具欄
const toolbar = reactive({
	list: [] as any[],

	async init() {
		const arr = orderBy(
			module.list.filter(e => e.enable !== false && !!e.toolbar).map(e => e.toolbar),
			'order'
		);

		this.list = await Promise.all(
			arr
				.filter(e => e?.component)
				.map(async e => {
					if (e) {
						const c = await (isFunction(e.component) ? e.component() : e.component);

						return {
							...e,
							component: markRaw(c.default || c)
						};
					}
				})
		);
	}
});

// 工具欄元件
const toolbarComponents = computed(() => {
	return toolbar.list.filter(e => {
		if (browser.isMini) {
			return e?.h5 ?? true;
		}

		return e?.pc ?? true;
	});
});

onMounted(() => {
	toolbar.init();
	loadReminderCount();
});
</script>

<style lang="scss" scoped>
.app-topbar {
	display: flex;
	align-items: center;
	height: 46px;
	padding: 0 10px;
	background-color: var(--el-bg-color);
	border-bottom: 1px solid var(--el-border-color-extra-light);
	box-sizing: border-box;
	transition: height 0.2s ease-in-out;

	.flex1 {
		flex: 1;
	}

	&__tools {
		display: flex;
		margin-right: 10px;

		& > li {
			display: flex;
			justify-content: center;
			align-items: center;
			list-style: none;
			height: 45px;
			cursor: pointer;
			margin-left: 10px;
		}
	}

	&__user {
		display: flex;
		align-items: center;
		outline: none;
		cursor: pointer;
		white-space: nowrap;
		padding: 5px 5px 5px 10px;
		border-radius: 6px;

		&:hover {
			background-color: var(--el-fill-color-light);
		}
	}

	:deep(.cl-comm__icon) {
		&:hover {
			border-color: var(--el-color-primary);
			background-color: transparent;
		}
	}
}

.contract-reminder {
	&__head,
	&__foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	&__head {
		margin-bottom: 8px;
		font-weight: 600;
	}

	&__list {
		max-height: 360px;
		overflow-y: auto;
	}

	&__item {
		padding: 10px;
		border: 1px solid var(--el-border-color-lighter);
		border-radius: 6px;
		margin-bottom: 8px;
		background: var(--el-fill-color-blank);

		&.is-unread {
			border-color: var(--el-color-warning-light-5);
			background: var(--el-color-warning-light-9);
		}
	}

	&__content {
		font-size: 13px;
		line-height: 1.5;
		color: var(--el-text-color-primary);
	}

	&__meta {
		margin-top: 4px;
		font-size: 12px;
		color: var(--el-text-color-secondary);
	}

	&__quotes {
		margin-top: 8px;
	}

	&__quote {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 4px 0;
		font-size: 12px;
	}
}
</style>

<style lang="scss">
.app-topbar__user-popper {
	.el-dropdown-menu__item {
		padding: 6px 12px;
		font-size: 12px;
	}

	.user {
		display: flex;
		align-items: center;
		padding: 10px 10px;
		width: 200px;
		border-bottom: 1px solid var(--el-color-info-light-9);

		.det {
			margin-left: 10px;
			flex: 1;
			font-size: 12px;
		}
	}

	.cl-svg {
		margin-right: 8px;
		font-size: 16px;
	}
}
</style>
