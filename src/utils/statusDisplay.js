export const CONTAINER_STATUS_DISPLAY = {
  online: { label: '运行中', color: 'green' },
  offline: { label: '已停止', color: 'volcano' },
  building: { label: '构建中', color: 'geekblue' },
  creating: { label: '创建中', color: 'blue' },
  starting: { label: '启动中', color: 'cyan' },
  restarting: { label: '重启中', color: 'purple' },
  stopping: { label: '停止中', color: 'orange' },
  paused: { label: '已冻结', color: 'volcano' },
  failed: { label: '异常', color: 'red' },
  unknown: { label: '未知', color: 'default' },
};

export const MACHINE_STATUS_DISPLAY = {
  online: { label: '运行中', color: 'green' },
  offline: { label: '已停止', color: 'volcano' },
  maintenance: { label: '维护中', color: 'orange' },
};

const normalizeStatus = status => String(status || 'unknown').toLowerCase();

export const getContainerStatusDisplay = status => {
  const normalized = normalizeStatus(status);
  return CONTAINER_STATUS_DISPLAY[normalized] || { label: normalized, color: 'default' };
};

export const getMachineStatusDisplay = status => {
  const normalized = normalizeStatus(status || 'offline');
  return MACHINE_STATUS_DISPLAY[normalized] || { label: normalized, color: 'default' };
};
