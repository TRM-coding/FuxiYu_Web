import React from 'react';
import { describe, it, expect, vi, beforeEach, onTestFinished } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

// antd message 在 jsdom 下的滚动条测量噪音与本用例无关，只保留组件实现
vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

vi.mock('../api/announcement_api', () => ({
  saveDraft: vi.fn(),
  getDraft: vi.fn(),
  listTemplates: vi.fn(),
}));

vi.mock('../api/machine_api', () => ({
  listAllMachineBrefInformation: vi.fn().mockResolvedValue({ machines: [] }),
  getDetailInformation: vi.fn(),
}));

vi.mock('../api/container_api', () => ({
  listAllContainerBrefInformation: vi.fn().mockResolvedValue({ containers_info: [] }),
  getContainerDetailInformation: vi.fn(),
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

import { getDraft, listTemplates, saveDraft } from '../api/announcement_api';
import { getDetailInformation, listAllMachineBrefInformation } from '../api/machine_api';
import { getContainerDetailInformation, listAllContainerBrefInformation } from '../api/container_api';
import { message } from 'antd';
import AnnouncementEditor from '../pages/AnnouncementEditor';

const TEMPLATE = {
  id: 5,
  name: '维护模板',
  subject_template: '维护主题',
  body_template: '维护正文',
};

const MACHINE_A = { machine_id: 1, machine_name: '机器A', machine_ip: '10.0.0.1' };
const MACHINE_B = { machine_id: 2, machine_name: '机器B', machine_ip: '10.0.0.2' };
const CONTAINER_A = { container_id: 11, container_name: '容器A', port: 2201 };
const CONTAINER_B = { container_id: 12, container_name: '容器B', port: 2202 };

const machineDetail = (machine) => ({
  ...machine,
  machine_type: 'gpu',
  cpu_core_number: 8,
  memory_size_gb: 32,
  gpu_number: 1,
  gpu_type: 'A100',
  disk_size_gb: 500,
  machine_description: `${machine.machine_name} 描述`,
});

const containerDetail = (container) => ({
  container_info: {
    ...container,
    image_name: `${container.container_name}镜像`,
    cpu_number: 4,
    memory_gb: 8,
    gpu_number: 0,
  },
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
};

const renderEditor = (entry = '/admin/announcements/editor') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AnnouncementEditor />
    </MemoryRouter>
  );

const renderEditorWithRoutes = (entry = '/admin/announcements/editor') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/admin/announcements/editor" element={<AnnouncementEditor />} />
        <Route
          path="/admin/announcements/templates"
          element={<LocationProbe />}
        />
      </Routes>
    </MemoryRouter>
  );

const templateCard = () => screen.getByText('模板选择').closest('.ant-card');
const machineCard = () => screen.getByText('机器属性').closest('.ant-card');
const containerCard = () => screen.getByText('容器属性').closest('.ant-card');
const contentTextarea = () => screen.getByPlaceholderText(/在此编写公告正文/);

const openSelect = (card) => {
  fireEvent.mouseDown(card.querySelector('.ant-select-selector'));
};

const clickSelectOption = async (text) => {
  const option = await waitFor(() => {
    const candidates = Array.from(document.querySelectorAll('.ant-select-item-option'))
      .filter(el => (el.textContent || '').includes(text));
    if (!candidates.length) throw new Error(`未找到下拉选项：${text}`);
    return candidates[candidates.length - 1];
  });
  fireEvent.click(option);
};

/** 打开「模板选择」下拉并点选某个模板（模板选择只是复制初值） */
const selectTemplate = async (name) => {
  openSelect(templateCard());
  await clickSelectOption(name);
};

const selectMachine = async (name) => {
  openSelect(machineCard());
  await clickSelectOption(name);
};

const selectContainer = async (name) => {
  openSelect(containerCard());
  await clickSelectOption(name);
};

const makeTemplate = (id) => ({
  id,
  name: `模板${id}`,
  subject_template: `主题${id}`,
  body_template: `正文${id}`,
});

beforeEach(() => {
  vi.clearAllMocks();
  listTemplates.mockResolvedValue({ templates: [TEMPLATE] });
  getDraft.mockResolvedValue({
    draft: { id: 9, title: '草稿标题', content: '草稿内容', raw_content: '草稿内容' },
  });
  saveDraft.mockResolvedValue({ success: 1, draft_id: 9 });
});

describe('AnnouncementEditor 模板/草稿契约（Q06/Q07）', () => {
  it('选模板把主题/正文复制进编辑器', async () => {
    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    await selectTemplate('维护模板');

    await waitFor(() => expect(contentTextarea().value).toBe('维护正文'));
    expect(screen.getByPlaceholderText('输入公告标题（邮件主题）').value).toBe('维护主题');
  });

  it('保存草稿不带 template_id，内容是用户编辑后的独立快照', async () => {
    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());
    await selectTemplate('维护模板');
    await waitFor(() => expect(contentTextarea().value).toBe('维护正文'));

    fireEvent.change(contentTextarea(), { target: { value: '维护正文 + 用户补充' } });
    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    const payload = saveDraft.mock.calls[0][0];
    expect(payload).not.toHaveProperty('template_id');
    expect(payload.content).toBe('维护正文 + 用户补充');
  });

  it('重开草稿：内容只来自草稿快照，不恢复也不重放模板选择', async () => {
    renderEditor('/admin/announcements/editor?draft_id=9');

    await waitFor(() => expect(getDraft).toHaveBeenCalledWith(9));
    await waitFor(() => expect(contentTextarea().value).toBe('草稿内容'));
    expect(screen.getByPlaceholderText('输入公告标题（邮件主题）').value).toBe('草稿标题');
    // 草稿没有模板关联：下拉不应显示任何已选项，模板正文也不会覆盖草稿内容
    expect(templateCard().querySelector('.ant-select-selection-item')).toBeNull();
  });

  it('清空模板选择不清空已编辑内容', async () => {
    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());
    await selectTemplate('维护模板');
    await waitFor(() => expect(contentTextarea().value).toBe('维护正文'));

    const clear = templateCard().querySelector('.ant-select-clear');
    expect(clear).toBeTruthy();
    fireEvent.mouseDown(clear);

    expect(contentTextarea().value).toBe('维护正文');
  });
});

const clickSelectOptionExact = async (text) => {
  const option = await waitFor(() => {
    const candidates = Array.from(document.querySelectorAll('.ant-select-item-option'))
      .filter(el => (el.textContent || '').trim() === text);
    if (!candidates.length) throw new Error(`未找到下拉选项：${text}`);
    return candidates[candidates.length - 1];
  });
  fireEvent.click(option);
};

describe('AnnouncementEditor 分页、乱序与光标（Q22/Q24/Q52/Q55）', () => {
  it('test_q24_announcement_first_page_zero 机器/容器列表首屏使用 page_number=0、page_size=500', async () => {
    listAllMachineBrefInformation.mockResolvedValue({ machines: [MACHINE_A, MACHINE_B] });
    listAllContainerBrefInformation.mockResolvedValue({ containers_info: [CONTAINER_A, CONTAINER_B] });
    getDetailInformation.mockResolvedValue(machineDetail(MACHINE_A));
    getContainerDetailInformation.mockResolvedValue(containerDetail(CONTAINER_A));

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    openSelect(machineCard());
    await waitFor(() => expect(listAllMachineBrefInformation).toHaveBeenCalledTimes(1));
    expect(listAllMachineBrefInformation).toHaveBeenCalledWith({
      page_number: 0,
      page_size: 500,
    });

    // 先收起机器下拉，否则紧接着点容器下拉只会关闭前者而不会触发容器加载。
    fireEvent.mouseDown(document.body);
    openSelect(containerCard());
    await waitFor(() => expect(listAllContainerBrefInformation).toHaveBeenCalledTimes(1));
    // 容器选择器独立于机器选择器：始终请求全量容器。
    expect(listAllContainerBrefInformation).toHaveBeenCalledWith({
      machine_id: '',
      page_number: 0,
      page_size: 500,
    });
  });

  it('test_q22_announcement_stale_machine_list 旧机器列表响应不得覆盖后一次加载', async () => {
    const firstMachines = deferred();
    const secondMachines = deferred();
    listAllMachineBrefInformation
      .mockImplementationOnce(() => firstMachines.promise)
      .mockImplementationOnce(() => secondMachines.promise);

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    openSelect(machineCard());
    await waitFor(() => expect(listAllMachineBrefInformation).toHaveBeenCalledTimes(1));
    fireEvent.mouseDown(document.body);
    openSelect(machineCard());
    await waitFor(() => expect(listAllMachineBrefInformation).toHaveBeenCalledTimes(2));

    await act(async () => {
      secondMachines.resolve({ machines: [MACHINE_B] });
    });
    expect(await screen.findByText('机器B (10.0.0.2)')).toBeInTheDocument();

    await act(async () => {
      firstMachines.resolve({ machines: [MACHINE_A] });
    });
    expect(screen.queryByText('机器A (10.0.0.1)')).not.toBeInTheDocument();
    expect(screen.getByText('机器B (10.0.0.2)')).toBeInTheDocument();
  });

  it('test_q22_announcement_stale_container 旧容器列表响应不得覆盖后一次加载', async () => {
    listAllMachineBrefInformation.mockResolvedValue({ machines: [MACHINE_A, MACHINE_B] });
    const firstContainers = deferred();
    const secondContainers = deferred();
    listAllContainerBrefInformation
      .mockImplementationOnce(() => firstContainers.promise)
      .mockImplementationOnce(() => secondContainers.promise);

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    openSelect(containerCard());
    await waitFor(() => expect(listAllContainerBrefInformation).toHaveBeenCalledTimes(1));
    expect(listAllContainerBrefInformation).toHaveBeenNthCalledWith(1, {
      machine_id: '',
      page_number: 0,
      page_size: 500,
    });
    fireEvent.mouseDown(document.body);
    openSelect(containerCard());
    await waitFor(() => expect(listAllContainerBrefInformation).toHaveBeenCalledTimes(2));

    await act(async () => {
      secondContainers.resolve({ containers_info: [CONTAINER_B] });
    });
    expect(await screen.findByText('容器B (port:2202)')).toBeInTheDocument();

    await act(async () => {
      firstContainers.resolve({ containers_info: [CONTAINER_A] });
    });

    expect(screen.queryByText('容器A (port:2201)')).not.toBeInTheDocument();
    expect(screen.getByText('容器B (port:2202)')).toBeInTheDocument();
  });

  it('test_q22_announcement_independent_selectors 机器选择不筛选/清空独立的容器选项与已选容器', async () => {
    listAllMachineBrefInformation.mockResolvedValue({ machines: [MACHINE_A, MACHINE_B] });
    listAllContainerBrefInformation.mockResolvedValue({ containers_info: [CONTAINER_A, CONTAINER_B] });
    getDetailInformation.mockImplementation(async (machineId) => (
      machineId === MACHINE_B.machine_id ? machineDetail(MACHINE_B) : machineDetail(MACHINE_A)
    ));
    getContainerDetailInformation.mockResolvedValue(containerDetail(CONTAINER_A));

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    openSelect(containerCard());
    await waitFor(() => expect(listAllContainerBrefInformation).toHaveBeenCalledTimes(1));
    await selectContainer('容器A (port:2201)');
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledWith(CONTAINER_A.container_id));
    expect(within(containerCard()).getByText('容器A (port:2201)')).toBeInTheDocument();
    expect(within(containerCard()).getByRole('button', { name: /容器名\(端口\): 容器A/ })).toBeInTheDocument();

    const containerCallsBefore = listAllContainerBrefInformation.mock.calls.length;
    await selectMachine('机器B (10.0.0.2)');
    await waitFor(() => expect(getDetailInformation).toHaveBeenCalledWith(MACHINE_B.machine_id));
    expect(screen.getByRole('button', { name: /机器名: 机器B/ })).toBeInTheDocument();

    // 机器选择不影响独立的容器选择器：不重拉、不清空选项、不丢已选容器。
    expect(listAllContainerBrefInformation).toHaveBeenCalledTimes(containerCallsBefore);
    expect(within(containerCard()).getByText('容器A (port:2201)')).toBeInTheDocument();
    expect(within(containerCard()).getByRole('button', { name: /容器名\(端口\): 容器A/ })).toBeInTheDocument();

    openSelect(containerCard());
    expect(await screen.findByText('容器B (port:2202)')).toBeInTheDocument();
  });

  it('test_q22_announcement_stale_detail 机器与容器旧详情响应不得覆盖当前选择', async () => {
    listAllMachineBrefInformation.mockResolvedValue({ machines: [MACHINE_A, MACHINE_B] });
    listAllContainerBrefInformation.mockResolvedValue({ containers_info: [CONTAINER_A, CONTAINER_B] });

    const machineA = deferred();
    const machineB = deferred();
    getDetailInformation
      .mockImplementationOnce(() => machineA.promise)
      .mockImplementationOnce(() => machineB.promise);

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    await selectMachine('机器A (10.0.0.1)');
    await waitFor(() => expect(getDetailInformation).toHaveBeenCalledTimes(1));
    await selectMachine('机器B (10.0.0.2)');
    await waitFor(() => expect(getDetailInformation).toHaveBeenCalledTimes(2));

    await act(async () => {
      machineB.resolve(machineDetail(MACHINE_B));
    });
    expect(screen.getByRole('button', { name: /机器名: 机器B/ })).toBeInTheDocument();

    await act(async () => {
      machineA.resolve(machineDetail(MACHINE_A));
    });
    expect(screen.queryByRole('button', { name: /机器名: 机器A/ })).toBeNull();
    expect(screen.getByRole('button', { name: /机器名: 机器B/ })).toBeInTheDocument();

    const containerA = deferred();
    const containerB = deferred();
    getContainerDetailInformation
      .mockImplementationOnce(() => containerA.promise)
      .mockImplementationOnce(() => containerB.promise);

    openSelect(containerCard());
    await waitFor(() => expect(listAllContainerBrefInformation).toHaveBeenCalledTimes(1));
    await selectContainer('容器A (port:2201)');
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(1));
    await selectContainer('容器B (port:2202)');
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(2));

    await act(async () => {
      containerB.resolve(containerDetail(CONTAINER_B));
    });
    expect(within(containerCard()).getByRole('button', { name: /容器名\(端口\): 容器B/ })).toBeInTheDocument();

    await act(async () => {
      containerA.resolve(containerDetail(CONTAINER_A));
    });
    expect(within(containerCard()).queryByRole('button', { name: /容器名\(端口\): 容器A/ })).toBeNull();
    expect(within(containerCard()).getByRole('button', { name: /容器名\(端口\): 容器B/ })).toBeInTheDocument();
  });

  it('test_q52_announcement_template_205 首批 200 项后以 offset=200 取回第 205 个并可选择', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => makeTemplate(index + 1));
    const secondPage = Array.from({ length: 5 }, (_, index) => makeTemplate(201 + index));
    listTemplates.mockImplementation(({ offset }) => Promise.resolve(
      offset === 200
        ? { templates: secondPage, total: 205 }
        : { templates: firstPage, total: 205 },
    ));

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(1));
    expect(listTemplates).toHaveBeenNthCalledWith(1, { limit: 200, offset: 0 });

    fireEvent.click(screen.getByRole('button', { name: /加载更多/ }));
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(2));
    expect(listTemplates).toHaveBeenNthCalledWith(2, { limit: 200, offset: 200 });

    openSelect(templateCard());
    const searchInput = templateCard().querySelector('input');
    fireEvent.keyDown(searchInput, { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, which: 38 });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 });

    await waitFor(() => expect(contentTextarea().value).toBe('正文205'));
  });

  it('test_q52_announcement_edit_template_link “编辑此模板”跳转携带 template_id', async () => {
    renderEditorWithRoutes();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    await selectTemplate('维护模板');
    await waitFor(() => expect(contentTextarea().value).toBe('维护正文'));
    fireEvent.click(screen.getByRole('button', { name: /编辑此模板/ }));

    await waitFor(() => expect(screen.getByTestId('location-search').textContent).toContain('template_id=5'));
  });

  it('test_q52_announcement_load_more_failure 加载更多失败保留已加载的 200 项并显示可读错误', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => makeTemplate(index + 1));
    listTemplates
      .mockResolvedValueOnce({ templates: firstPage, total: 205 })
      .mockRejectedValueOnce(new Error('network down'));

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /加载更多/ }));
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(message.error).toHaveBeenCalledWith(expect.stringMatching(/加载更多模板失败/)));

    // 列表未被清空：仍可直接选择首批里的模板
    openSelect(templateCard());
    await clickSelectOptionExact('模板1');
    await waitFor(() => expect(contentTextarea().value).toBe('正文1'));
  });

  it('test_q55_announcement_insert_selection 保持焦点时替换原选区并把光标移到插入内容末尾', async () => {
    renderEditor();
    const textarea = contentTextarea();
    fireEvent.change(textarea, { target: { value: 'ABCDE' } });
    textarea.focus();
    textarea.setSelectionRange(2, 4); // 选中 CD
    fireEvent.select(textarea);

    fireEvent.click(screen.getByRole('button', { name: '标准问候' }));

    expect(contentTextarea().value).toBe('AB您好！\nE');
    expect(document.activeElement).toBe(contentTextarea());
    await waitFor(() => expect(contentTextarea().selectionStart).toBe(6));
    expect(contentTextarea().selectionEnd).toBe(6);
  });

  it('test_q55_announcement_insert_after_blur 按钮夺焦后仍按缓存选区插入而不是追加到末尾', async () => {
    renderEditor();
    const textarea = contentTextarea();
    fireEvent.change(textarea, { target: { value: 'ABCDE' } });
    textarea.focus();
    textarea.setSelectionRange(1, 3); // 选中 BC
    fireEvent.select(textarea);

    const button = screen.getByRole('button', { name: '标准问候' });
    button.focus(); // 模拟浏览器点击按钮时 textarea 先失焦
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);

    expect(contentTextarea().value).toBe('A您好！\nDE');
  });

  it('test_q22_announcement_unmount_no_apply 卸载后旧机器/容器列表与详情响应不写回且无错误副作用', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    const pageSideEffectErrors = () => consoleError.mock.calls.filter(([first]) => (
      typeof first === 'string'
      && /load (machines|containers)|not wrapped in act|unmounted component/i.test(first)
    ));

    // 第一条路径：机器/容器 list 均在途时卸载，随后回包也不得写回或报页面错误。
    const oldMachines = deferred();
    const oldContainers = deferred();
    listAllMachineBrefInformation.mockImplementationOnce(() => oldMachines.promise);
    listAllContainerBrefInformation.mockImplementationOnce(() => oldContainers.promise);

    const first = renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());
    openSelect(machineCard());
    await waitFor(() => expect(listAllMachineBrefInformation).toHaveBeenCalledTimes(1));
    fireEvent.mouseDown(document.body);
    openSelect(containerCard());
    await waitFor(() => expect(listAllContainerBrefInformation).toHaveBeenCalledTimes(1));

    first.unmount();
    expect(pageSideEffectErrors()).toEqual([]);
    await act(async () => {
      oldMachines.reject(new Error('late machine list'));
      oldContainers.reject(new Error('late container list'));
    });
    expect(pageSideEffectErrors()).toEqual([]);

    // 第二条路径：机器/容器 detail 均在途时卸载，旧详情回包后重新挂载仍是独立新状态。
    listAllMachineBrefInformation.mockResolvedValueOnce({ machines: [MACHINE_A] });
    listAllContainerBrefInformation.mockResolvedValueOnce({ containers_info: [CONTAINER_A] });
    const oldMachineDetail = deferred();
    const oldContainerDetail = deferred();
    getDetailInformation.mockImplementationOnce(() => oldMachineDetail.promise);
    getContainerDetailInformation.mockImplementationOnce(() => oldContainerDetail.promise);

    const second = renderEditor();
    await waitFor(() => expect(screen.getByText('模板选择')).toBeInTheDocument());
    await selectMachine('机器A (10.0.0.1)');
    await waitFor(() => expect(getDetailInformation).toHaveBeenCalledTimes(1));
    openSelect(containerCard());
    await waitFor(() => expect(listAllContainerBrefInformation).toHaveBeenCalledTimes(2));
    await selectContainer('容器A (port:2201)');
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(1));

    second.unmount();
    await act(async () => {
      oldMachineDetail.resolve(machineDetail({
        machine_id: 98,
        machine_name: '旧机器',
        machine_ip: '10.9.9.8',
      }));
      oldContainerDetail.resolve(containerDetail({
        container_id: 98,
        container_name: '旧容器',
        port: 9998,
      }));
    });
    expect(pageSideEffectErrors()).toEqual([]);

    // 第三条路径：重新挂载后只显示自己的新列表/新详情，旧实例回包不得泄漏。
    const newMachines = deferred();
    const newContainers = deferred();
    const newMachineDetail = deferred();
    const newContainerDetail = deferred();
    listAllMachineBrefInformation.mockImplementationOnce(() => newMachines.promise);
    listAllContainerBrefInformation.mockImplementationOnce(() => newContainers.promise);
    getDetailInformation.mockImplementationOnce(() => newMachineDetail.promise);
    getContainerDetailInformation.mockImplementationOnce(() => newContainerDetail.promise);

    renderEditor();
    await waitFor(() => expect(screen.getByText('模板选择')).toBeInTheDocument());

    openSelect(machineCard());
    await waitFor(() => expect(listAllMachineBrefInformation).toHaveBeenCalledTimes(3));
    expect(screen.queryByText('旧机器 (10.9.9.8)')).not.toBeInTheDocument();
    await act(async () => { newMachines.resolve({ machines: [MACHINE_B] }); });
    await clickSelectOption('机器B (10.0.0.2)');
    await waitFor(() => expect(getDetailInformation).toHaveBeenCalledTimes(2));
    await act(async () => { newMachineDetail.resolve(machineDetail(MACHINE_B)); });
    expect(screen.getByRole('button', { name: /机器名: 机器B/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /机器名: 旧机器/ })).toBeNull();

    openSelect(containerCard());
    await waitFor(() => expect(listAllContainerBrefInformation).toHaveBeenCalledTimes(3));
    expect(screen.queryByText('旧容器 (port:9998)')).not.toBeInTheDocument();
    await act(async () => { newContainers.resolve({ containers_info: [CONTAINER_B] }); });
    await clickSelectOption('容器B (port:2202)');
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(2));
    await act(async () => { newContainerDetail.resolve(containerDetail(CONTAINER_B)); });
    expect(within(containerCard()).getByRole('button', { name: /容器名\(端口\): 容器B/ })).toBeInTheDocument();
    expect(within(containerCard()).queryByRole('button', { name: /容器名\(端口\): 旧容器/ })).toBeNull();
    expect(pageSideEffectErrors()).toEqual([]);
  });
});
