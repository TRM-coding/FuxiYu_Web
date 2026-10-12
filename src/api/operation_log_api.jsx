import { BACKEND_ORIGIN, API_ROUTES, REQUEST_TIMEOUT, CREDENTIALS } from '../configs/backend_config';
import { createController, unregisterController } from '../utils/requestManager';


const createTimeoutController = (timeout) => {
	const controller = createController();
	const timer = setTimeout(() => {
		try { controller.abort(); } catch (e) {}
	}, timeout || REQUEST_TIMEOUT);
	return { controller, timer };
};

const ensureOk = async (res, action) => {
	if (!res.ok) {
		let body = null;
		try {
			body = await res.json();
		} catch (e) {
			body = await res.text().catch(() => null);
		}
		const text = body && typeof body === 'string' ? body : (body ? JSON.stringify(body) : null);
		const err = new Error(`${action} failed: ${res.status} ${text || res.statusText}`);
		err.status = res.status;
		err.route = res.url;
		err.body = body;
		throw err;
	}
	return res.json();
};

/** 查询操作日志（operator-only）。params 见后端 /admin/operation_logs。 */
export const listOperationLogs = async (params = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.ADMIN_OPERATION_LOGS, BACKEND_ORIGIN);
		Object.entries(params || {}).forEach(([k, v]) => {
			if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
		});
		const res = await fetch(url.toString(), {
			method: 'GET',
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'List operation logs');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		throw err;
	}
};

/** 操作日志统计（operator-only）。params 支持 start / end。 */
export const getOperationLogStats = async (params = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.ADMIN_OPERATION_LOGS_STATS, BACKEND_ORIGIN);
		Object.entries(params || {}).forEach(([k, v]) => {
			if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
		});
		const res = await fetch(url.toString(), {
			method: 'GET',
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Get operation log stats');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		throw err;
	}
};
