import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
}));

vi.mock('../api/image_api', () => ({
  createImage: vi.fn(),
  deleteImage: vi.fn(),
  getImageDetailInformation: vi.fn(),
  listImageBrefInformation: vi.fn(),
  updateImage: vi.fn(),
}));

import { getUserPermissions } from '../api/user_api';
import { getImageDetailInformation, listImageBrefInformation, updateImage } from '../api/image_api';
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
    getUserPermissions.mockResolvedValue(['image:view', 'image:edit']);

    render(<MemoryRouter><CreateImage /></MemoryRouter>);

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
    },
  });

  beforeEach(() => {
    localStorage.setItem('currentUserName', 'editor');
    localStorage.setItem('currentUserId', '3');
    getUserPermissions.mockReset();
    getUserPermissions.mockResolvedValue(['image:view', 'image:edit']);
    listImageBrefInformation.mockReset();
    listImageBrefInformation.mockResolvedValue({ images: [{ image_id: 9, name: 'jenkins', status: 'ready' }] });
    getImageDetailInformation.mockReset();
    updateImage.mockReset();
    updateImage.mockResolvedValue({ success: 1 });
  });

  it('把详情里的 entrypoint 读进表单，并在保存时发出去', async () => {
    getImageDetailInformation.mockResolvedValue(imageDetail('tail -f /dev/null'));

    render(<MemoryRouter><CreateImage /></MemoryRouter>);

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

    render(<MemoryRouter><CreateImage /></MemoryRouter>);

    const field = await screen.findByDisplayValue('jenkins.sh');
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.click(await screen.findByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(updateImage).toHaveBeenCalledWith(expect.objectContaining({ entrypoint: '' }));
    });
  });
});
