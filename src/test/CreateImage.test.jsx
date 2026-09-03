import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
import { listImageBrefInformation } from '../api/image_api';
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
