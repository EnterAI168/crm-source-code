import { ElMessage } from 'element-plus';
import { service } from '/@/cool';

export function useMenu() {
	// 根據 router 刪除選單
	async function del(router: string) {
		const menus = await service.base.sys.menu.list();
		const item = menus.find(e => e.router == router);
		if (item) {
			await service.base.sys.menu.delete({ ids: [item.id] });
		}
	}

	// 建立選單、權限、檔案
	function create(data: EpsModule): Promise<() => void> {
		return new Promise(async (resolve, reject) => {
			// 檢視檔案路徑
			data.viewPath = `modules/${data.module}/views${data.router?.replace(
				`/${data.module}`,
				''
			)}.vue`;

			// 刪除原選單
			await del(data.router);

			// 新增新選單
			service.base.sys.menu
				.add({
					type: 1,
					isShow: true,
					keepAlive: true,
					...data,
					api: undefined,
					code: undefined
				})
				.then(res => {
					// 權限列表
					const perms = data.api?.map(e => {
						const d = {
							type: 2,
							parentId: res.id,
							name: e.summary || e.path,
							perms: [e.path]
						};

						if (e.path == '/update') {
							if (data.api?.find(a => a.path == '/info')) {
								d.perms.push('/info');
							}
						}

						return {
							...d,
							perms: d.perms
								.map(e =>
									(data.prefix?.replace('/admin/', '') + e).replace(/\//g, ':')
								)
								.join(',')
						};
					});

					// 批次插入權限
					service.base.sys.menu.add(perms).then(() => {
						resolve(() => {
							// 建立檔案
							service
								.request({
									url: '/__cool_createFile',
									method: 'POST',
									proxy: false,
									data: {
										code: data.code,
										path: data.viewPath
									}
								})
								.then(() => {
									location.reload();
								});
						});
					});
				})
				.catch(err => {
					ElMessage.error(err.message);
					reject();
				});
		});
	}

	return {
		del,
		create
	};
}
