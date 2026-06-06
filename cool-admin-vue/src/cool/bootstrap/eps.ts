import { merge } from 'lodash-es';
import { BaseService, service } from '../service';
import { isDev } from '/@/config';
import { eps } from 'virtual:eps';
import { hmr } from '../hooks';

export function createEps() {
	// 設定 request 方法
	function set(d: any) {
		if (d.namespace) {
			const a = new BaseService(d.namespace);

			for (const i in d) {
				const { path, method = 'get' } = d[i];

				if (path) {
					a.request = a.request;

					a[i] = function (data?: any) {
						return this.request({
							url: path,
							method,
							[method.toLocaleLowerCase() == 'post' ? 'data' : 'params']: data
						});
					};
				}
			}

			for (const i in a) {
				d[i] = a[i];
			}
		} else {
			for (const i in d) {
				set(d[i]);
			}
		}
	}

	// 遍歷每一個方法
	set(eps.service);

	// 合併 eps
	merge(service, eps.service);

	// 熱更新處理
	hmr.setData('service', service);

	// 提示
	if (isDev) {
		console.log('[cool-eps] updated');
	}
}

// 監聽 vite 觸發事件
if (import.meta.hot) {
	import.meta.hot.on('eps-update', ({ service }) => {
		if (service) {
			eps.service = service;
		}
		createEps();
	});
}
