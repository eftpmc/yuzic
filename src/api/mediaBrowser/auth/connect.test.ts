import { connect } from './connect';
import { JELLYFIN_BRAND } from '../brand';
import { serverFetch } from '@/features/mtls/serverFetch';

jest.mock('@/features/mtls/serverFetch', () => ({ serverFetch: jest.fn() }));
jest.mock('../clientHeader', () => ({ mediaBrowserClientHeader: () => 'MediaBrowser Client="Yuzic"' }));

const mockServerFetch = serverFetch as jest.MockedFunction<typeof serverFetch>;

describe('MediaBrowser password authentication', () => {
  beforeEach(() => jest.resetAllMocks());

  it('includes the application name Jellyfin 12 requires in the authentication body', async () => {
    mockServerFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ AccessToken: 'token', User: { Id: 'user-1' } }),
    } as Response);

    await expect(connect(JELLYFIN_BRAND, 'https://music.example', 'zack', 'secret'))
      .resolves.toEqual({ success: true, token: 'token', userId: 'user-1' });

    expect(mockServerFetch).toHaveBeenCalledWith('https://music.example/Users/AuthenticateByName', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ Username: 'zack', Pw: 'secret', App: 'Yuzic' }),
    }));
  });
});
