import { getQualityProfiles } from './index';

describe('getQualityProfiles', () => {
  const client = { request: jest.fn() };

  beforeEach(() => {
    client.request.mockReset();
  });

  it('hits /qualityprofile and returns the parsed list', async () => {
    const profiles = [
      { id: 1, name: 'Standard' },
      { id: 4, name: 'Lossless' },
    ];
    client.request.mockResolvedValueOnce(profiles);

    const result = await getQualityProfiles(client as any);

    expect(client.request).toHaveBeenCalledWith('/qualityprofile');
    expect(result).toEqual(profiles);
  });
});
