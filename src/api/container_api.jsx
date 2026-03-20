import { BACKEND_BASE_URL, API_ROUTES, REQUEST_TIMEOUT, CREDENTIALS } from '../configs/backend_config';
import { createController, unregisterController, abortAll } from '../utils/requestManager';
import { getAuthTokenHeader } from '../utils/authToken';


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
		if (res.status === 401 || res.status === 403) {
			try { abortAll('auth'); } catch (e) {}
			// clear local auth and redirect to login for 401
			if (typeof window !== 'undefined' && res.status === 401) {
				try {
					localStorage.removeItem('authToken');
					sessionStorage.removeItem('authToken');
					localStorage.removeItem('currentUserId');
					localStorage.removeItem('currentUserName');
					document.cookie = 'auth_token=; Max-Age=0; path=/';
				} catch (e) {}
				try { window.location.href = '/'; } catch (e) {}
			}
		}
		throw err;
	}
	return res.json();
};

export const createContainer = async (payload = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_CREATE}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthTokenHeader(),
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
		try { unregisterController(controller); } catch (e) {}
		if (err.name === 'AbortError') throw new Error('Create container request timed out');
		throw err;
	}
};

export const deleteContainer = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_DELETE}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthTokenHeader(),
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
		try { unregisterController(controller); } catch (e) {}
		if (err.name === 'AbortError') throw new Error('Delete container request timed out');
		throw err;
	}
};

export const addCollaborator = async ({ user_id = '', container_id = 0, role = 'COLLABORATOR' } = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_ADD_COLLABORATOR}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthTokenHeader(),
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
		try { unregisterController(controller); } catch (e) {}
		if (err.name === 'AbortError') throw new Error('Add collaborator request timed out');
		throw err;
	}
};

export const removeCollaborator = async ({ user_id = '', container_id = 0 } = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_REMOVE_COLLABORATOR}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthTokenHeader(),
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
		try { unregisterController(controller); } catch (e) {}
		if (err.name === 'AbortError') throw new Error('Remove collaborator request timed out');
		throw err;
	}
};

export const updateRole = async ({ container_id = 0, user_id = '', updated_role = 'COLLABORATOR' } = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_UPDATE_ROLE}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthTokenHeader(),
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
		try { unregisterController(controller); } catch (e) {}
		if (err.name === 'AbortError') throw new Error('Update role request timed out');
		throw err;
	}
};

export const getContainerDetailInformation = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_GET_DETAIL}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthTokenHeader(),
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
		try { unregisterController(controller); } catch (e) {}
		if (err.name === 'AbortError') throw new Error('Get container detail request timed out');
		throw err;
	}
};

export const listAllContainerBrefInformation = async ({ machine_id = '', user_id = '', page_number = 1, page_size = 10 } = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_LIST}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthTokenHeader(),
			},
			body: JSON.stringify({ machine_id, user_id, page_number, page_size }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		const result = await ensureOk(res, 'List containers');
		unregisterController(controller);
		return result;
	} catch (err) {
		clearTimeout(timer);
		try { unregisterController(controller); } catch (e) {}
		if (err.name === 'AbortError') throw new Error('List containers request timed out');
		throw err;
	}
};

export const startContainer = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_START}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthTokenHeader(),
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
		try { unregisterController(controller); } catch (e) {}
		if (err.name === 'AbortError') throw new Error('Start container request timed out');
		throw err;
	}
};

export const stopContainer = async (container_id = 0, timeout = null, stopTimeout = 5) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_STOP}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthTokenHeader(),
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
		try { unregisterController(controller); } catch (e) {}
		if (err.name === 'AbortError') throw new Error('Stop container request timed out');
		throw err;
	}
};

export const restartContainer = async (container_id = 0, timeout = null, restartTimeout = 5) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_RESTART}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthTokenHeader(),
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
		try { unregisterController(controller); } catch (e) {}
		if (err.name === 'AbortError') throw new Error('Restart container request timed out');
		throw err;
	}
};

export const refreshLastSshLoginTime = async (container_id = 0, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_REFRESH_LAST_SSH_TIME}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getAuthTokenHeader(),
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
		try { unregisterController(controller); } catch (e) {}
		if (err.name === 'AbortError') throw new Error('Refresh last ssh login time request timed out');
		throw err;
	}
};

export default {
	createContainer,
	deleteContainer,
	addCollaborator,
	removeCollaborator,
	updateRole,
	getContainerDetailInformation,
	listAllContainerBrefInformation,
	startContainer,
	stopContainer,
	restartContainer,
	refreshLastSshLoginTime,
};
