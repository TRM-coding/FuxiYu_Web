import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PermissionProvider } from '../contexts/PermissionContext';

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

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
  getImageDetailInformation,
  listImageBrefInformation,
  setImageValidRange,
  setImageVisibleUsers,
  updateImage,
} from '../api/image_api';
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

  it('image:manage 通配者仍可编辑他人模板（与后端第 0 步放行一致）', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['image:view', 'image:edit', 'image:manage'], userId: 3, userName: 'editor',
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
