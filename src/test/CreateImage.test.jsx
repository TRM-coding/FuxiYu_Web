import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PermissionProvider } from '../contexts/PermissionContext';

// 默认导出保持替身，便于断言页面调用口径；保留真实 routeErrorMap 供 Q37 表遍历。
vi.mock('../utils/showErrorModal', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: vi.fn() };
});

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  // 自定义可见范围的名单选择器数据源（切到 custom 态才拉）
  listAllUserBrefInformation: vi.fn(),
}));

vi.mock('../api/image_api', () => ({
  createImage: vi.fn(),
  deleteImage: vi.fn(),
  getImageDetailInformation: vi.fn(),
  listImageBrefInformation: vi.fn(),
  setImageValidRange: vi.fn(),
  setImageVisibleUsers: vi.fn(),
  updateImage: vi.fn(),
}));

import { getUserPermissions, listAllUserBrefInformation } from '../api/user_api';
import {
  createImage,
  getImageDetailInformation,
  listImageBrefInformation,
  setImageValidRange,
  setImageVisibleUsers,
  updateImage,
} from '../api/image_api';
import showErrorModal, { routeErrorMap } from '../utils/showErrorModal';
import CreateImage from '../pages/CreateImage';

describe('CreateImage image resource scope', () => {
  beforeEach(() => {
    localStorage.setItem('currentUserName', 'editor');
    localStorage.setItem('currentUserId', '3');
    getUserPermissions.mockReset();
    listImageBrefInformation.mockReset();
    listImageBrefInformation.mockResolvedValue({ images: [] });
  });

  it('loads user_images scope by default for image editors', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['image:view', 'image:edit'], userId: 3, userName: 'editor' });

    render(<MemoryRouter><PermissionProvider><CreateImage /></PermissionProvider></MemoryRouter>);

    await screen.findByText('环境模板');
    await waitFor(() => {
      expect(listImageBrefInformation).toHaveBeenCalledWith({
        page_number: 1,
        page_size: 100,
        image_search: '',
        mine_only: true,
      });
    });
  });
});

describe('CreateImage entrypoint 编辑', () => {
  const imageDetail = (entrypoint) => ({
    image: {
      image_id: 9,
      name: 'jenkins',
      status: 'ready',
      base_image: 'jenkins/jenkins:2.516.2',
      dockerfile_body: 'RUN echo hi\n',
      entrypoint,
      // 归属闸（image:owner）：不写这个就是"系统模板"，非 manage 用户改不了——
      // 这几条用例测的是 entrypoint 的收发，所以得让自己是创建者（当前用户 3）
      created_by_user_id: 3,
    },
  });

  beforeEach(() => {
    localStorage.setItem('currentUserName', 'editor');
    localStorage.setItem('currentUserId', '3');
    getUserPermissions.mockReset();
    getUserPermissions.mockResolvedValue({ entities: ['image:view', 'image:edit'], userId: 3, userName: 'editor' });
    listImageBrefInformation.mockReset();
    listImageBrefInformation.mockResolvedValue({ images: [{ image_id: 9, name: 'jenkins', status: 'ready' }] });
    getImageDetailInformation.mockReset();
    updateImage.mockReset();
    updateImage.mockResolvedValue({ success: 1 });
    setImageValidRange.mockReset();
    setImageValidRange.mockResolvedValue({ success: 1 });
    setImageVisibleUsers.mockReset();
    setImageVisibleUsers.mockResolvedValue({ success: 1, user_ids: [] });
    listAllUserBrefInformation.mockReset();
    listAllUserBrefInformation.mockResolvedValue({
      users: [
        { id: 4, username: 'alice', name: 'Alice' },
        { id: 5, username: 'bob', name: 'Bob' },
      ],
    });
  });

  it('把详情里的 entrypoint 读进表单，并在保存时发出去', async () => {
    getImageDetailInformation.mockResolvedValue(imageDetail('tail -f /dev/null'));

    render(<MemoryRouter><PermissionProvider><CreateImage /></PermissionProvider></MemoryRouter>);

    const field = await screen.findByDisplayValue('tail -f /dev/null');
    fireEvent.change(field, { target: { value: 'jenkins.sh' } });
    fireEvent.click(await screen.findByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(updateImage).toHaveBeenCalledWith(
        expect.objectContaining({ image_id: 9, entrypoint: 'jenkins.sh' }),
      );
    });
  });

  it('清空时发空串而不是 null（null 会被后端 exclude_none 丢掉，等于没清）', async () => {
    getImageDetailInformation.mockResolvedValue(imageDetail('jenkins.sh'));

    render(<MemoryRouter><PermissionProvider><CreateImage /></PermissionProvider></MemoryRouter>);

    const field = await screen.findByDisplayValue('jenkins.sh');
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.click(await screen.findByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(updateImage).toHaveBeenCalledWith(expect.objectContaining({ entrypoint: '' }));
    });
  });
});

describe('CreateImage 可见范围三态', () => {
  const detailWith = (valid_range, extra = {}) => ({
    image: {
      image_id: 9,
      name: 'jenkins',
      status: 'ready',
      base_image: 'ubuntu:24.04',
      dockerfile_body: '',
      entrypoint: '',
      valid_range,
      // 默认视为"自己建的"（当前用户 3）；归属相关的用例显式覆盖这一项
      created_by_user_id: 3,
      ...extra,
    },
  });

  const renderPage = async () => {
    render(<MemoryRouter><PermissionProvider><CreateImage /></PermissionProvider></MemoryRouter>);
    await screen.findByText('可见范围');
  };

  beforeEach(() => {
    localStorage.setItem('currentUserName', 'editor');
    localStorage.setItem('currentUserId', '3');
    getUserPermissions.mockReset();
    getUserPermissions.mockResolvedValue({ entities: ['image:view', 'image:edit'], userId: 3, userName: 'editor' });
    listImageBrefInformation.mockReset();
    listImageBrefInformation.mockResolvedValue({ images: [{ image_id: 9, name: 'jenkins', status: 'ready' }] });
    getImageDetailInformation.mockReset();
    updateImage.mockReset();
    updateImage.mockResolvedValue({ success: 1 });
    setImageValidRange.mockReset();
    setImageValidRange.mockResolvedValue({ success: 1 });
    setImageVisibleUsers.mockReset();
    setImageVisibleUsers.mockResolvedValue({ success: 1, user_ids: [] });
    listAllUserBrefInformation.mockReset();
    listAllUserBrefInformation.mockResolvedValue({
      users: [
        { id: 4, username: 'alice', name: 'Alice', email: 'alice@bjtu.edu.cn' },
        { id: 5, username: 'bob', name: 'Bob', email: 'bob@bjtu.edu.cn' },
      ],
    });
  });

  it('切到「所有人可见」只调三态接口，不碰名单接口', async () => {
    getImageDetailInformation.mockResolvedValue(detailWith('custom'));
    await renderPage();

    fireEvent.click(await screen.findByText('所有人可见'));
    fireEvent.click(await screen.findByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(setImageValidRange).toHaveBeenCalledWith({ image_id: 9, valid_range: 'everyone' });
    });
    // 非 custom 态改名单会被后端拒绝，前端也不该发
    expect(setImageVisibleUsers).not.toHaveBeenCalled();
  });

  it('custom 态保存时先定态、再发名单（顺序是硬约束）', async () => {
    getImageDetailInformation.mockResolvedValue(detailWith('private'));
    await renderPage();

    fireEvent.click(await screen.findByText('自定义可见范围'));
    await waitFor(() => expect(listAllUserBrefInformation).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(setImageValidRange).toHaveBeenCalledWith({ image_id: 9, valid_range: 'custom' });
      expect(setImageVisibleUsers).toHaveBeenCalledWith({ image_id: 9, user_ids: [] });
    });
    expect(
      setImageValidRange.mock.invocationCallOrder[0]
    ).toBeLessThan(setImageVisibleUsers.mock.invocationCallOrder[0]);
  });

  it('非 custom 态不提供名单入口，并说明名单会保留', async () => {
    getImageDetailInformation.mockResolvedValue(detailWith('everyone'));
    await renderPage();

    expect(screen.queryByText('选择可以使用这个模板的用户')).toBeNull();
    expect(screen.getByText(/原有的授权名单会保留/)).toBeTruthy();
    // 非 custom 态不该去拉用户列表
    expect(listAllUserBrefInformation).not.toHaveBeenCalled();
  });

  // 页面上不止一个 Select（状态也是），所以所有查询都要落在「可见范围」那一栏里
  const rangeField = () => screen.getByText('可见范围').closest('.ci-field');

  it('可以按邮箱搜出用户（同名同姓时靠它区分）', async () => {
    getImageDetailInformation.mockResolvedValue(detailWith('custom'));
    await renderPage();
    await waitFor(() => expect(listAllUserBrefInformation).toHaveBeenCalled());

    fireEvent.mouseDown(rangeField().querySelector('.ant-select-selector'));
    const input = rangeField().querySelector('input[role="combobox"]');
    fireEvent.change(input, { target: { value: 'bob@bjtu' } });

    await waitFor(() => {
      // 命中的人留下，没命中的被过滤掉
      expect(screen.getByText('Bob @bob <bob@bjtu.edu.cn>')).toBeTruthy();
      expect(screen.queryByText('Alice @alice <alice@bjtu.edu.cn>')).toBeNull();
    });
  });

  it('下拉里带邮箱，但标签里只留短的那份', async () => {
    getImageDetailInformation.mockResolvedValue(detailWith('custom', { visible_user_ids: [4] }));
    await renderPage();
    await waitFor(() => expect(listAllUserBrefInformation).toHaveBeenCalled());

    // 选中项以 tagLabel 呈现：不带邮箱
    await waitFor(() => {
      const tag = rangeField().querySelector('.ant-select-selection-item');
      expect(tag?.textContent).toBe('Alice @alice');
    });
  });

  it('他人创建的模板：编辑区与可见范围都标灰，并说明原因', async () => {
    // created_by 是别人（当前用户是 3）——后端 image:owner 也是这条口径
    getImageDetailInformation.mockResolvedValue(
      detailWith('custom', { created_by_user_id: 7, visible_user_ids: [4] })
    );
    await renderPage();
    await waitFor(() => expect(listAllUserBrefInformation).toHaveBeenCalled());

    expect(screen.getByText(/该模板由他人创建/)).toBeTruthy();
    // 内容编辑区全部标灰
    expect(screen.getByDisplayValue('jenkins').disabled).toBe(true);
    // 可见范围两个入口也标灰（仍展示状态，只是改不了）
    const segmented = rangeField().querySelector('.ant-segmented');
    expect(segmented.className).toContain('ant-segmented-disabled');
    expect(rangeField().querySelector('.ant-select-disabled')).toBeTruthy();
  });

  it('系统内置模板（created_by 为空）对非 manage 编辑者同样是只读', async () => {
    // 后端 image:owner 是 `created_by_user_id == user_id`，None 对谁都不成立——
    // 所以平台内置模板只有 image:manage 通配者能改。前端标灰是与它对齐，不是另立一套。
    getImageDetailInformation.mockResolvedValue(
      detailWith('everyone', { created_by_user_id: null })
    );
    await renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('jenkins').disabled).toBe(true);
    });
    expect(screen.getByText(/该模板由他人创建/)).toBeTruthy();
  });

  it('资源位为 true 者可编辑他人模板（与后端资源门放行一致）', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['image:view', 'image:edit', 'image:manage'],
      imageResourceUnrestricted: true,
      userId: 3, userName: 'editor',
    });
    getImageDetailInformation.mockResolvedValue(
      detailWith('custom', { created_by_user_id: 7 })
    );
    await renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('jenkins').disabled).toBe(false);
    });
    expect(screen.queryByText(/该模板由他人创建/)).toBeNull();
  });

  it('自己创建的模板照旧可编辑（别把归属闸做成谁都改不了）', async () => {
    getImageDetailInformation.mockResolvedValue(
      detailWith('custom', { created_by_user_id: 3 })
    );
    await renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('jenkins').disabled).toBe(false);
    });
    expect(screen.queryByText(/该模板由他人创建/)).toBeNull();
  });

  it('把详情里回显的 custom 名单读进选择器', async () => {
    getImageDetailInformation.mockResolvedValue(detailWith('custom', { visible_user_ids: [4, 5] }));
    await renderPage();

    await waitFor(() => expect(listAllUserBrefInformation).toHaveBeenCalled());
    // 已选中的两个人以标签形式呈现
    await waitFor(() => {
      const tags = [...rangeField().querySelectorAll('.ant-select-selection-item')]
        .map(node => node.textContent);
      expect(tags).toEqual(['Alice @alice', 'Bob @bob']);
    });
  });
});

// ── 资源通配与两层 RBAC（Q14）──────────────────────────────────────────────
//
// payload 形状与真实 PermissionContext 契约一致：方法级看生效集 entities，
// 资源级看服务端明说的 imageResourceUnrestricted（**不从 entities 反推**）。
// 这组用例锁住两条：实体通配派生的 image:manage 不得开资源范围；
// 直持 manage + 实体通配时资源范围仍然成立。
describe('CreateImage 资源通配与两层 RBAC', () => {
  const renderPage = () =>
    render(<MemoryRouter><PermissionProvider><CreateImage /></PermissionProvider></MemoryRouter>);

  const detailAsOther = () => ({
    image: {
      image_id: 9,
      name: 'jenkins',
      status: 'ready',
      base_image: 'ubuntu:24.04',
      dockerfile_body: '',
      entrypoint: '',
      valid_range: 'custom',
      created_by_user_id: 7, // 别人的模板
    },
  });

  beforeEach(() => {
    localStorage.setItem('currentUserName', 'editor');
    localStorage.setItem('currentUserId', '3');
    getUserPermissions.mockReset();
    listImageBrefInformation.mockReset();
    listImageBrefInformation.mockResolvedValue({ images: [{ image_id: 9, name: 'jenkins', status: 'ready' }] });
    getImageDetailInformation.mockReset();
    updateImage.mockReset();
    updateImage.mockResolvedValue({ success: 1 });
    setImageValidRange.mockReset();
    setImageValidRange.mockResolvedValue({ success: 1 });
    setImageVisibleUsers.mockReset();
    setImageVisibleUsers.mockResolvedValue({ success: 1, user_ids: [] });
    listAllUserBrefInformation.mockReset();
    listAllUserBrefInformation.mockResolvedValue({ users: [] });
  });

  it('资源通配：出现「仅看我创建的」，默认只看我的、可关掉看全部，并能编辑他人模板', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['image:view', 'image:edit', 'bypass_resource'],
      imageResourceUnrestricted: true,
      userId: 3, userName: 'editor',
    });
    getImageDetailInformation.mockResolvedValue(detailAsOther());
    renderPage();

    await screen.findByText('仅看我创建的');
    await waitFor(() => expect(screen.getByDisplayValue('jenkins').disabled).toBe(false));
    await waitFor(() => {
      expect(listImageBrefInformation).toHaveBeenCalledWith(
        expect.objectContaining({ mine_only: true }),
      );
    });

    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => {
      expect(listImageBrefInformation).toHaveBeenCalledWith(
        expect.objectContaining({ mine_only: false }),
      );
    });
  });

  it('仅 bypass_auth_entity：生效集里有 image:manage，但资源位为 false → 不开资源范围', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['bypass_auth_entity', 'image:view', 'image:edit', 'image:manage'],
      imageResourceUnrestricted: false,
      userId: 3, userName: 'editor',
    });
    getImageDetailInformation.mockResolvedValue(detailAsOther());
    renderPage();

    await screen.findByText('环境模板');
    await waitFor(() => expect(screen.getByDisplayValue('jenkins').disabled).toBe(true));
    expect(screen.getByText(/该模板由他人创建/)).toBeTruthy();
    expect(screen.queryByText('仅看我创建的')).toBeNull();
    await waitFor(() => {
      expect(listImageBrefInformation).toHaveBeenCalledWith(
        expect.objectContaining({ mine_only: true }),
      );
    });
  });

  it('直持 image:manage + 方法通配：资源位为 true → 仍可编辑他人模板', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['bypass_auth_entity', 'image:view', 'image:edit', 'image:manage'],
      imageResourceUnrestricted: true, // 服务端判定：直持 manage
      userId: 3, userName: 'editor',
    });
    getImageDetailInformation.mockResolvedValue(detailAsOther());
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue('jenkins').disabled).toBe(false));
    expect(screen.getByText('仅看我创建的')).toBeTruthy();
    expect(screen.queryByText(/该模板由他人创建/)).toBeNull();
  });

  it('旧响应缺资源位：保守 false，即便 entities 含 image:manage 也不开资源范围', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['image:view', 'image:edit', 'image:manage'],
      // 没有 imageResourceUnrestricted 字段
      userId: 3, userName: 'editor',
    });
    getImageDetailInformation.mockResolvedValue(detailAsOther());
    renderPage();

    await screen.findByText('环境模板');
    await waitFor(() => expect(screen.getByDisplayValue('jenkins').disabled).toBe(true));
    expect(screen.queryByText('仅看我创建的')).toBeNull();
  });

  it('删除键按方法级 image:manage：无该权限时不渲染', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['image:view', 'image:edit', 'bypass_resource'],
      imageResourceUnrestricted: true,
      userId: 3, userName: 'editor',
    });
    getImageDetailInformation.mockResolvedValue({
      image: {
        image_id: 9, name: 'jenkins', status: 'ready', base_image: 'ubuntu:24.04',
        dockerfile_body: '', entrypoint: '', valid_range: 'custom', created_by_user_id: 3,
      },
    });
    renderPage();

    await screen.findByDisplayValue('jenkins');
    // 资源通配不放行 require_permission("image:manage")，删除键不该出现
    expect(screen.queryByRole('button', { name: /删除/ })).toBeNull();
  });

  it('删除键按方法级 image:manage：生效集含 manage 时渲染', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['image:view', 'image:edit', 'image:manage'],
      imageResourceUnrestricted: true,
      userId: 3, userName: 'editor',
    });
    getImageDetailInformation.mockResolvedValue({
      image: {
        image_id: 9, name: 'jenkins', status: 'ready', base_image: 'ubuntu:24.04',
        dockerfile_body: '', entrypoint: '', valid_range: 'custom', created_by_user_id: 3,
      },
    });
    renderPage();

    await screen.findByDisplayValue('jenkins');
    expect(screen.getByRole('button', { name: /删除/ })).toBeTruthy();
  });
});

// ── Q22 / Q63 / Q64 / Q37：镜像页请求生命周期、状态与错误表 ────────────────
//
// 这些用例统一用 deferred promise 控制返回顺序：竞态断言只看“最终界面是什么”，
// 不能用“AbortController 存在”代替。列表请求的旧响应必须被丢弃，新建/更新后的
// 重取也必须走真实列表接口，而不是只刷新右侧详情。

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const imageDetail = (id, name) => ({
  image: {
    image_id: id,
    name,
    status: 'ready',
    base_image: 'ubuntu:22.04',
    dockerfile_body: '',
    entrypoint: '',
    valid_range: 'custom',
    created_by_user_id: 3,
  },
});

const renderCreateImage = () =>
  render(
    <MemoryRouter>
      <PermissionProvider>
        <CreateImage />
      </PermissionProvider>
    </MemoryRouter>,
  );

const resetCreateImageMocks = () => {
  localStorage.setItem('currentUserName', 'editor');
  localStorage.setItem('currentUserId', '3');
  getUserPermissions.mockReset();
  getUserPermissions.mockResolvedValue({
    entities: ['image:view', 'image:edit'],
    userId: 3,
    userName: 'editor',
  });
  listImageBrefInformation.mockReset();
  getImageDetailInformation.mockReset();
  createImage.mockReset();
  updateImage.mockReset();
  setImageValidRange.mockReset();
  setImageVisibleUsers.mockReset();
  listAllUserBrefInformation.mockReset();
  listAllUserBrefInformation.mockResolvedValue({ users: [] });
  showErrorModal.mockReset();
};

const searchInput = () => screen.getByPlaceholderText('搜索模板、ID、描述');

const submitSearch = (value) => {
  fireEvent.change(searchInput(), { target: { value } });
  // Input.Search 的搜索按钮比模拟 Enter 更稳定，也覆盖真实点击入口。
  fireEvent.click(document.querySelector('.ci-search-row .ant-input-search-button'));
};

const nameInput = () => screen.getByText('模板名称').closest('label').querySelector('input');

describe('CreateImage Q22 列表请求只应用当前关键词', () => {
  beforeEach(resetCreateImageMocks);

  it('test_q22_create_image_current_keyword', async () => {
    const pending = deferred();
    listImageBrefInformation
      .mockResolvedValueOnce({ images: [] })
      .mockReturnValueOnce(pending.promise);
    getImageDetailInformation.mockResolvedValue(imageDetail(21, '当前关键词结果'));

    renderCreateImage();
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledTimes(1));

    submitSearch('current');
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledTimes(2));
    expect(listImageBrefInformation.mock.calls[1][0]).toMatchObject({
      image_search: 'current',
      mine_only: true,
    });

    await act(async () => {
      pending.resolve({ images: [{ image_id: 21, name: '当前关键词结果', status: 'ready' }] });
    });

    await waitFor(() => {
      const selected = document.querySelector('.ci-image-card.is-selected');
      expect(selected?.textContent).toContain('当前关键词结果');
    });
    expect(listImageBrefInformation.mock.calls[1][0].image_search).toBe('current');
  });

  it('test_q22_create_image_stale_keyword', async () => {
    const stale = deferred();
    const current = deferred();
    listImageBrefInformation
      .mockResolvedValueOnce({ images: [] })
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(current.promise);
    getImageDetailInformation.mockImplementation(async (id) => imageDetail(id, id === 2 ? '新关键词结果' : '旧关键词结果'));

    renderCreateImage();
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledTimes(1));

    submitSearch('alpha');
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledTimes(2));
    submitSearch('beta');
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledTimes(3));

    await act(async () => {
      current.resolve({ images: [{ image_id: 2, name: '新关键词结果', status: 'ready' }] });
    });
    await waitFor(() => {
      expect(document.querySelector('.ci-image-card.is-selected')?.textContent).toContain('新关键词结果');
    });

    await act(async () => {
      stale.resolve({ images: [{ image_id: 1, name: '旧关键词结果', status: 'ready' }] });
    });

    await waitFor(() => {
      expect(screen.queryByText('旧关键词结果')).toBeNull();
      const selected = document.querySelector('.ci-image-card.is-selected');
      expect(selected?.textContent).toContain('新关键词结果');
    });
    expect(getImageDetailInformation).not.toHaveBeenCalledWith(1);
  });
});

describe('CreateImage Q63 新建成功后的列表与表单状态', () => {
  beforeEach(resetCreateImageMocks);

  it('test_q63_create_image_clear_keyword_select_new', async () => {
    listImageBrefInformation
      .mockResolvedValueOnce({ images: [] })
      .mockResolvedValueOnce({ images: [{ image_id: 1, name: '旧模板', status: 'ready' }] })
      .mockResolvedValueOnce({
        images: [
          { image_id: 1, name: '旧模板', status: 'ready' },
          { image_id: 42, name: '新模板', status: 'draft' },
        ],
      });
    getImageDetailInformation.mockImplementation(async (id) => (
      imageDetail(id, id === 42 ? '服务端名称' : '旧模板')
    ));
    createImage.mockResolvedValue({ image_id: 42 });

    renderCreateImage();
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledTimes(1));

    submitSearch('不匹配关键词');
    await waitFor(() => expect(screen.getByDisplayValue('旧模板')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /新建/ }));

    fireEvent.change(nameInput(), { target: { value: '新模板' } });
    fireEvent.click(await screen.findByRole('button', { name: /保存/ }));

    await waitFor(() => expect(createImage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledTimes(3));
    expect(listImageBrefInformation.mock.calls[2][0]).toMatchObject({ image_search: '' });

    await waitFor(() => {
      expect(searchInput().value).toBe('');
      expect(screen.getByDisplayValue('新模板')).toBeTruthy();
      expect(document.querySelector('.ci-image-card.is-selected')?.textContent).toContain('新模板');
    });
    expect(screen.queryByDisplayValue('服务端名称')).toBeNull();
  });

  it('test_q63_create_image_reload_failure_preserves_form', async () => {
    const reloadError = Object.assign(new Error('list failed'), {
      status: 500,
      route: 'https://ctrl/api/images/list_all_image_bref_information',
    });
    listImageBrefInformation
      .mockResolvedValueOnce({ images: [] })
      .mockResolvedValueOnce({ images: [{ image_id: 1, name: '旧模板', status: 'ready' }] })
      .mockRejectedValueOnce(reloadError);
    getImageDetailInformation.mockImplementation(async (id) => (
      imageDetail(id, id === 42 ? '服务端名称' : '旧模板')
    ));
    createImage.mockResolvedValue({ image_id: 42 });

    renderCreateImage();
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledTimes(1));

    submitSearch('不匹配关键词');
    await waitFor(() => expect(screen.getByDisplayValue('旧模板')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /新建/ }));
    fireEvent.change(nameInput(), { target: { value: '失败仍保留' } });
    fireEvent.click(await screen.findByRole('button', { name: /保存/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
    expect(listImageBrefInformation.mock.calls[2][0]).toMatchObject({ image_search: '' });
    await waitFor(() => {
      expect(searchInput().value).toBe('');
      expect(screen.getByDisplayValue('失败仍保留')).toBeTruthy();
      expect(document.querySelector('.ci-image-card.is-selected')).toBeNull();
    });
    expect(getImageDetailInformation).not.toHaveBeenCalledWith(42);
  });
});

describe('CreateImage Q64 更新成功后重取当前关键词列表', () => {
  beforeEach(resetCreateImageMocks);

  it('test_q64_create_image_update_refetches_list', async () => {
    listImageBrefInformation
      .mockResolvedValueOnce({ images: [{ image_id: 9, name: '旧名称', status: 'ready' }] })
      .mockResolvedValueOnce({ images: [{ image_id: 9, name: '新名称', status: 'ready' }] });
    getImageDetailInformation.mockResolvedValue(imageDetail(9, '旧名称'));
    updateImage.mockResolvedValue({ success: 1 });

    renderCreateImage();
    await screen.findByDisplayValue('旧名称');
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByDisplayValue('旧名称'), { target: { value: '新名称' } });
    fireEvent.click(await screen.findByRole('button', { name: /保存/ }));

    await waitFor(() => expect(updateImage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledTimes(2));
    expect(listImageBrefInformation.mock.calls[1][0]).toMatchObject({ image_search: '' });

    await waitFor(() => {
      expect(screen.getByDisplayValue('新名称')).toBeTruthy();
      expect(document.querySelector('.ci-image-card.is-selected')?.textContent).toContain('新名称');
    });
  });

  it('test_q64_create_image_update_failure_keeps_list', async () => {
    const updateError = Object.assign(new Error('Update image failed: 422'), {
      status: 422,
      route: 'https://ctrl/api/images/update_image',
      body: { success: 0, message: '镜像名称重复', error_reason: 'duplicate_entry' },
    });
    listImageBrefInformation.mockResolvedValue({
      images: [{ image_id: 9, name: '旧名称', status: 'ready' }],
    });
    getImageDetailInformation.mockResolvedValue(imageDetail(9, '旧名称'));
    updateImage.mockRejectedValue(updateError);

    renderCreateImage();
    await screen.findByDisplayValue('旧名称');
    fireEvent.change(screen.getByDisplayValue('旧名称'), { target: { value: '提交失败' } });
    fireEvent.click(await screen.findByRole('button', { name: /保存/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
    expect(listImageBrefInformation).toHaveBeenCalledTimes(1);
    expect(showErrorModal.mock.calls[0][0]).toMatchObject({
      message: updateError.body,
      status: 422,
      route: updateError.route,
    });
    await waitFor(() => {
      expect(screen.getByText('旧名称')).toBeTruthy();
      expect(screen.queryByText('模板已保存')).toBeNull();
    });
  });
});

// 与 specs/frontend--page-create-image/spec.md 的 route/error_reason 表逐行对齐。
const CREATE_IMAGE_ERROR_TABLE = [
  { route: '/images/create_image', reason: 'duplicate_entry', text: '镜像名称已存在' },
  { route: '/images/create_image', reason: 'invalid_status', text: '镜像状态不合法' },
  { route: '/images/create_image', reason: 'create_failed', text: '创建镜像失败' },
  { route: '/images/update_image', reason: 'duplicate_entry', text: '镜像名称已存在' },
  { route: '/images/update_image', reason: 'invalid_status', text: '镜像状态不合法' },
  { route: '/images/update_image', reason: 'image_not_found', text: '镜像不存在' },
  { route: '/images/update_image', reason: 'update_failed', text: '更新镜像失败' },
  { route: '/images/delete_image', reason: 'image_not_found', text: '镜像不存在' },
  { route: '/images/set_image_valid_range', reason: 'invalid_valid_range', text: '镜像可见范围不合法' },
  { route: '/images/set_image_valid_range', reason: 'image_not_found', text: '镜像不存在' },
  { route: '/images/set_image_valid_range', reason: 'set_valid_range_failed', text: '设置镜像可见范围失败' },
  { route: '/images/set_image_visible_users', reason: 'not_custom_range', text: '只有自定义可见范围才能设置用户名单' },
  { route: '/images/set_image_visible_users', reason: 'unknown_user', text: '用户名单中存在不存在的用户' },
  { route: '/images/set_image_visible_users', reason: 'image_not_found', text: '镜像不存在' },
  { route: '/images/set_image_visible_users', reason: 'set_visible_users_failed', text: '保存镜像可见用户失败' },
];

describe('CreateImage Q37 镜像错误表', () => {
  const originalGetComputedStyle = window.getComputedStyle;

  const visibleDialogs = () => Array.from(document.querySelectorAll('.ant-modal'))
    .filter(el => el.style.display !== 'none');

  const dialogText = () => {
    const dialogs = visibleDialogs();
    if (!dialogs.length) throw new Error('当前没有可见的错误弹窗');
    return dialogs[dialogs.length - 1].textContent || '';
  };

  const closeActualDialogs = async () => {
    for (let i = 0; i < 5; i += 1) {
      const buttons = Array.from(document.querySelectorAll('.ant-modal button'))
        .filter(btn => (btn.textContent || '').replace(/\s/g, '') === '好的');
      if (!buttons.length) break;
      await act(async () => {
        buttons[buttons.length - 1].click();
      });
    }
    await waitFor(() => expect(visibleDialogs()).toHaveLength(0));
  };

  beforeAll(() => {
    window.getComputedStyle = (el) => originalGetComputedStyle.call(window, el);
  });

  afterAll(() => {
    window.getComputedStyle = originalGetComputedStyle;
  });

  afterEach(closeActualDialogs);

  it('test_q37_create_image_known_reasons', () => {
    const missing = CREATE_IMAGE_ERROR_TABLE.filter(
      row => routeErrorMap[row.route]?.[row.reason] !== row.text,
    );
    expect(missing).toEqual([]);
  });

  it('test_q37_create_image_unknown_reason', async () => {
    const actual = await vi.importActual('../utils/showErrorModal');
    const before = visibleDialogs().length;
    await act(async () => {
      actual.default({
        message: { success: 0, error_reason: 'unexpected_image_reason' },
        status: 400,
        route: 'https://ctrl/api/images/create_image',
      });
    });
    await waitFor(() => expect(visibleDialogs().length).toBeGreaterThan(before));
    const text = dialogText();
    expect(text).toContain('未收录的错误原因：unexpected_image_reason');
    expect(text).not.toContain('镜像名称已存在');
  });
});
