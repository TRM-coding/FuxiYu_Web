import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), error: vi.fn() } };
});

import { message } from 'antd';
import CredentialModal from '../components/CredentialModal';

const Harness = ({ initial = [] }) => {
  const [credentials, setCredentials] = useState(initial);
  const [open, setOpen] = useState(true);
  return (
    <>
      <CredentialModal open={open} credentials={credentials} onClose={() => { setOpen(false); setCredentials([]); }} />
      <span data-testid="remaining">{credentials.length}</span>
    </>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe('CredentialModal', () => {
  it('test_credential_modal_render_copy_close renders exact lines, copies, closes and clears', async () => {
    render(<Harness initial={[
      { login_name: 'root', password: 'pw-root' },
      { login_name: 'oldroot', password: 'pw-old' },
    ]} />);
    expect(screen.getByText('重置后root的密码：')).toBeInTheDocument();
    expect(screen.getByText('重置后oldroot的密码：')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /复制/ })[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('pw-root');
    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
    expect(screen.queryByText('重置后root的密码：')).not.toBeInTheDocument();
    expect(screen.getByTestId('remaining').textContent).toBe('0');
  });

  it('test_credential_no_persistence does not store passwords or log them; copy failure is safe', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
    render(<Harness initial={[{ login_name: 'root', password: 'pw-root' }]} />);
    await userEvent.click(screen.getByRole('button', { name: /复制/ }));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(JSON.stringify(localStorage)).not.toContain('pw-root');
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('pw-root'));
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('pw-root'));
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});
