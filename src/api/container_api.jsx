import { BACKEND_ORIGIN, API_ROUTES, REQUEST_TIMEOUT, MOUNT_USAGE_TIMEOUT, CREDENTIALS } from '../configs/backend_config';
import { createController, unregisterController, abortAll } from '../utils/requestManager';


const createTimeoutController = (timeout) => {
	const controller = createController();
	const timer = setTimeout(() => {
		controller.abort();
	}, timeout || REQUEST_TIMEOUT);
	return { controller, timer };
};

const toOptionalId = (value) => {
	if (value === '' || value === null || value === undefined) return null;
	const id = Number(value);
	return Number.isInteger(id) && id >= 0 ? id : null;
};

const ensureOk = async (res, action) => {
	if (!res.ok) {
		let body = null;
		try {
			body = await res.json();
		} catch {
			body = await res.text().catch(() => null);
		}
		const text = body && typeof body === 'string' ? body : (body ? JSON.stringify(body) : null);
		const err = new Error(`${action} failed: ${res.status} ${text || res.statusText}`);
		err.status = res.status;
		err.route = res.url;
		err.body = body;
		if (res.status === 401) {
			abortAll('auth');
			// 401 只发信号（abortAll → 'auth:expired'），统一由 App 级监听器处置：
			// 不碰 localStorage（本地身份已废除）/ cookie（HttpOnly，删不掉）/ 硬跳转（会打风暴）。
			// 403 是一般权限拒绝：不清身份、不中断其它请求，交给调用方展示拒绝原因。
		}
		throw err;
	}
	const body = await res.json();
	// HTTP 2xx 但业务 success=0 不是成功：后端成功一律 success=1，_error 才会给 0。
	if (body && typeof body === 'object' && !Array.isArray(body)
		&& (body.success === 0 || body.success === false)) {
		const err = new Error(`${action} failed: ${body.message || 'business failure'}`);
		err.status = res.status;
		err.route = res.url;
		err.body = body;
		throw err;
	}
	return body;
};

export const createContainer = async (payload = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_CREATE, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Create container');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Create container request timed out');
		throw err;
	}
};

export const deleteContainer = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_DELETE, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Delete container');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Delete container request timed out');
		throw err;
	}
};

export const addCollaborator = async ({ user_id = '', container_id = 0, role = 'COLLABORATOR' } = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_ADD_COLLABORATOR, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ user_id, container_id, role }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Add collaborator');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Add collaborator request timed out');
		throw err;
	}
};

export const removeCollaborator = async ({ user_id = '', container_id = 0 } = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_REMOVE_COLLABORATOR, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ user_id, container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Remove collaborator');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Remove collaborator request timed out');
		throw err;
	}
};

export const updateRole = async ({ container_id = 0, user_id = '', updated_role = 'COLLABORATOR' } = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_UPDATE_ROLE, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ container_id, user_id, updated_role }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Update role');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Update role request timed out');
		throw err;
	}
};

export const getContainerDetailInformation = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_GET_DETAIL, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Get container detail');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Get container detail request timed out');
		throw err;
	}
};

export const getContainerOperationLogs = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_OPERATION_LOGS, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Get container operation logs');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Get container operation logs request timed out');
		throw err;
	}
};

export const getContainerStatus = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_STATUS, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Get container status');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Get container status request timed out');
		throw err;
	}
};

export const listAllContainerBrefInformation = async ({ machine_id = '', user_id = '', container_search = '', page_number = 1, page_size = 10 } = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const machineId = toOptionalId(machine_id);
		const userId = toOptionalId(user_id);
		const containerSearch = String(container_search || '').trim();
		const url = new URL(API_ROUTES.CONTAINERS_LIST, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ machine_id: machineId, user_id: userId, container_search: containerSearch, page_number, page_size }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'List containers');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('List containers request timed out');
		throw err;
	}
};

export const listDeletedContainers = async ({ page_number = 1, page_size = 20 } = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_LIST_DELETED, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ page_number, page_size }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'List deleted containers');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('List deleted containers request timed out');
		throw err;
	}
};

const normalizeDeletedMountUsageIds = (deletedIds) => {
	if (!Array.isArray(deletedIds)) {
		throw new TypeError('deleted_ids must be an array');
	}
	const ids = [];
	const seen = new Set();
	for (const value of deletedIds) {
		if (!Number.isInteger(value) || value <= 0) {
			throw new TypeError('deleted_ids must contain positive integers only');
		}
		if (seen.has(value)) continue;
		seen.add(value);
		ids.push(value);
	}
	if (ids.length > 100) {
		throw new RangeError('deleted_ids must contain at most 100 ids');
	}
	return ids;
};

/**
 * 读取当前页已删除容器的 mount 用量。
 *
 * 只发送去重后的正整数 deleted_ids；不发送 path/machine_id，也不直接访问 Node。
 * 响应边界只接受 `success === 1` 且 `usages` 为数组；HTTP 404/405、success=0、
 * 非数组等整体失败原样抛给调用方降级。逐项字段由展示层严格校验，绝不补 0。
 * 支持页面通过 `signal` 取消，并带独立短超时（默认 10s，不复用详情 45s）。
 */
export const getDeletedContainerMountUsage = async (
	deletedIds,
	{ signal = null, timeout = MOUNT_USAGE_TIMEOUT } = {},
) => {
	const ids = normalizeDeletedMountUsageIds(deletedIds);
	if (ids.length === 0) return { success: 1, usages: [] };
	if (signal?.aborted) {
		const err = new Error('Get deleted container mount usage aborted');
		err.name = 'AbortError';
		throw err;
	}

	const controller = createController();
	const timeoutMs = timeout || MOUNT_USAGE_TIMEOUT;
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, timeoutMs);
	const handleExternalAbort = () => {
		controller.abort();
	};

	try {
		if (signal) {
			signal.addEventListener('abort', handleExternalAbort, { once: true });
			// addEventListener 不会补发已发生的 abort：登记后再确认一次。
			if (signal.aborted) controller.abort();
		}
		const url = new URL(API_ROUTES.CONTAINERS_GET_DELETED_MOUNT_USAGE, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			// 唯一允许进入请求体的业务字段：deleted_ids。路径只留在列表展示层。
			body: JSON.stringify({ deleted_ids: ids }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		const body = await ensureOk(res, 'Get deleted container mount usage');
		if (!body || typeof body !== 'object' || Array.isArray(body) || body.success !== 1) {
			const err = new Error('Get deleted container mount usage failed: invalid success envelope');
			err.status = res.status;
			err.route = res.url;
			err.body = body;
			err.code = 'bad_response';
			throw err;
		}
		if (!Array.isArray(body.usages)) {
			const err = new Error('Get deleted container mount usage failed: usages must be an array');
			err.status = res.status;
			err.route = res.url;
			err.body = body;
			err.code = 'bad_response';
			throw err;
		}
		return body;
	} catch (err) {
		if (err?.name === 'AbortError' && timedOut) {
			const timeoutErr = new Error('Get deleted container mount usage request timed out');
			timeoutErr.name = 'TimeoutError';
			timeoutErr.code = 'request_timeout';
			throw timeoutErr;
		}
		throw err;
	} finally {
		clearTimeout(timer);
		if (signal) {
			signal.removeEventListener('abort', handleExternalAbort);
		}
		unregisterController(controller);
	}
};

export const cleanDeletedContainerMount = async (mount_cleanup_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_CLEAN_DELETED_MOUNT, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mount_cleanup_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Clean deleted container mount');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Clean deleted container mount request timed out');
		throw err;
	}
};

/**
 * 恢复容器。
 *
 * content_source 只在「模板就绪但容器落后」时需要——那时内容会真正改变，后端不设默认，
 * 必须由界面明确选择（默认预选快照）。其余情形传 null 即可，后端会忽略。
 */
export const resurrectDeletedContainer = async (deleted_id = 0, content_source = null, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_RESURRECT_DELETED, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ deleted_id, content_source }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Resurrect deleted container');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Resurrect deleted container request timed out');
		throw err;
	}
};

export const startContainer = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_START, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Start container');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Start container request timed out');
		throw err;
	}
};

export const stopContainer = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_STOP, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
 			body: JSON.stringify({ container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Stop container');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Stop container request timed out');
		throw err;
	}
};

export const restartContainer = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_RESTART, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Restart container');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Restart container request timed out');
		throw err;
	}
};

export const refreshLastSshLoginTime = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_REFRESH_LAST_SSH_TIME, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Refresh last ssh login time');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Refresh last ssh login time request timed out');
		throw err;
	}
};

export const setLongTermContainer = async ({ container_id = 0, is_long_term = false } = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_SET_LONG_TERM, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ container_id, is_long_term }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Set long-term container');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		unregisterController(controller);
		if (err.name === 'AbortError') throw new Error('Set long-term container request timed out');
		throw err;
	}
};

export const unpauseContainer = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const url = new URL(API_ROUTES.CONTAINERS_UNPAUSE, BACKEND_ORIGIN).toString();
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'Unpause container');
		return result;
	} catch (err) {
		clearTimeout(timer);
		throw err;
	} finally {
		unregisterController(controller);
	}
};

export default {
	createContainer,
	deleteContainer,
	addCollaborator,
	removeCollaborator,
	updateRole,
	getContainerDetailInformation,
	getContainerOperationLogs,
	getContainerStatus,
	listAllContainerBrefInformation,
	listDeletedContainers,
	getDeletedContainerMountUsage,
	cleanDeletedContainerMount,
	resurrectDeletedContainer,
	startContainer,
	stopContainer,
	restartContainer,
	refreshLastSshLoginTime,
	setLongTermContainer,
};
