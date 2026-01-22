import { BACKEND_BASE_URL, API_ROUTES, REQUEST_TIMEOUT, CREDENTIALS } from '../configs/backend_config';


const createTimeoutController = (timeout) => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout || REQUEST_TIMEOUT);
	return { controller, timer };
};

const ensureOk = async (res, action) => {
	if (!res.ok) {
		const text = await res.text().catch(() => null);
		throw new Error(`${action} failed: ${res.status} ${text || res.statusText}`);
	}
	return res.json();
};

const getTokenHeader = () => {
	try {
		const token = localStorage.getItem('authToken');
		return token ? { token } : {};
	} catch (e) {
		return {};
	}
};

export const createContainer = async (payload = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_CREATE}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getTokenHeader(),
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		return await ensureOk(res, 'Create container');
	} catch (err) {
		clearTimeout(timer);
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
				...getTokenHeader(),
			},
			body: JSON.stringify({ container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		return await ensureOk(res, 'Delete container');
	} catch (err) {
		clearTimeout(timer);
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
				...getTokenHeader(),
			},
			body: JSON.stringify({ user_id, container_id, role }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		return await ensureOk(res, 'Add collaborator');
	} catch (err) {
		clearTimeout(timer);
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
				...getTokenHeader(),
			},
			body: JSON.stringify({ user_id, container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		return await ensureOk(res, 'Remove collaborator');
	} catch (err) {
		clearTimeout(timer);
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
				...getTokenHeader(),
			},
			body: JSON.stringify({ container_id, user_id, updated_role }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		return await ensureOk(res, 'Update role');
	} catch (err) {
		clearTimeout(timer);
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
				...getTokenHeader(),
			},
			body: JSON.stringify({ container_id }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		return await ensureOk(res, 'Get container detail');
	} catch (err) {
		clearTimeout(timer);
		if (err.name === 'AbortError') throw new Error('Get container detail request timed out');
		throw err;
	}
};

export const listAllContainerBrefInformation = async ({ machine_id = '', page_number = 1, page_size = 10 } = {}, timeout = null) => {
	const { controller, timer } = createTimeoutController(timeout);
	try {
		const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.CONTAINERS_LIST}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...getTokenHeader(),
			},
			body: JSON.stringify({ machine_id, page_number, page_size }),
			signal: controller.signal,
			credentials: CREDENTIALS,
		});
		clearTimeout(timer);
		return await ensureOk(res, 'List containers');
	} catch (err) {
		clearTimeout(timer);
		if (err.name === 'AbortError') throw new Error('List containers request timed out');
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
};

