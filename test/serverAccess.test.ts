import { describe, expect, it, vi } from 'vitest';
import { requestAccess, requestServerAccess } from '../src/serverAccess';

describe('server access', () => {
  it('asks for the origin of the server', async () => {
    const request = vi.fn().mockResolvedValue(true);
    await expect(requestAccess({ request }, 'https://smtw.example.org/')).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith({ origins: ['https://smtw.example.org/*'] });
  });

  it('reports a refusal or an error as no access', async () => {
    await expect(requestAccess({ request: vi.fn().mockResolvedValue(false) }, 'https://smtw.example.org/')).resolves.toBe(false);
    await expect(requestAccess({ request: vi.fn().mockRejectedValue(new Error('no input')) }, 'https://smtw.example.org/')).resolves.toBe(false);
  });

  it('does not ask without the permissions API or a server address', async () => {
    const request = vi.fn();
    await expect(requestAccess(undefined, 'https://smtw.example.org/')).resolves.toBe(true);
    await expect(requestAccess({ request }, '')).resolves.toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it('never asks on the web page', async () => {
    await expect(requestServerAccess()).resolves.toBe(true);
  });
});
