import { hmr } from '../hooks';
import { BaseService } from './base';

// service 資料集合
export const service: Eps.Service = hmr.getData('service', {
	request: new BaseService().request
});

export * from './base';
export * from './stream';
