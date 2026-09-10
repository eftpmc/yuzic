import { createNavidromeClient } from './client';

/**
 * The avatar URL, which is the whole of #202 on the Navidrome side.
 *
 * Navidrome serves `getAvatar` for every account — a gravatar where the user
 * has one, its own generated image otherwise — and the app simply never asked,
 * so every account showed an initial in a coloured disc instead.
 */
describe('buildAvatarUrl', () => {
  const client = () =>
    createNavidromeClient({
      serverUrl: 'https://music.example.com/',
      username: 'zack',
      password: 'hunter2',
    });

  it('points at getAvatar for the signed-in user', () => {
    const url = new URL(client().buildAvatarUrl());
    expect(url.origin + url.pathname).toBe('https://music.example.com/rest/getAvatar.view');
    expect(url.searchParams.get('username')).toBe('zack');
  });

  it('carries token auth, because the image loader fetches this itself', () => {
    // The `<Image>` pipeline issues the request without going through the
    // client, so credentials have to be in the URL as they are for cover art.
    const params = new URL(client().buildAvatarUrl()).searchParams;
    expect(params.get('u')).toBe('zack');
    expect(params.get('t')).toMatch(/^[a-f0-9]{32}$/);
    expect(params.get('s')).toBeTruthy();
    // Never the password itself.
    expect(client().buildAvatarUrl()).not.toContain('hunter2');
  });

  it('does not ask for JSON', () => {
    // The response is a PNG. With `f=json` Navidrome answers with an error
    // document instead of an image, so the avatar would never load.
    expect(new URL(client().buildAvatarUrl()).searchParams.get('f')).toBeNull();
  });

  it('salts each build, so two URLs are not byte-identical', () => {
    const c = client();
    expect(c.buildAvatarUrl()).not.toBe(c.buildAvatarUrl());
  });
});
