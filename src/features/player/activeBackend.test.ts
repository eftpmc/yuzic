/**
 * Switching players.
 *
 * The dangerous moment is the handover: two players holding an audio session
 * at once is worse than either being wrong on its own, and a paused player
 * still owns its session, its notification and its remote commands. So what
 * these check is mostly that the outgoing one is actually let go of.
 */

const mockRntp = { stop: jest.fn(), clear: jest.fn(), tag: 'rntp' };
const mockEngine = { stop: jest.fn(), clear: jest.fn(), tag: 'engine' };
const mockRntpFactory = jest.fn(() => mockRntp);
const mockEngineFactory = jest.fn(() => mockEngine);

jest.mock('./createRntpBackend', () => ({ createRntpBackend: mockRntpFactory }));
jest.mock('./createEngineBackend', () => ({ createEngineBackend: mockEngineFactory }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const backendModule = require('./activeBackend');
const {
  getBackend,
  getBackendKind,
  setBackendKind,
  subscribeBackendKind,
  resetBackendForTests,
} = backendModule;

beforeEach(() => {
  resetBackendForTests();
  mockRntp.stop.mockClear();
  mockRntp.clear.mockClear();
  mockEngine.stop.mockClear();
  mockEngine.clear.mockClear();
  mockRntpFactory.mockClear();
  mockEngineFactory.mockClear();
});

describe('which player is in use', () => {
  it('starts on rntp, because the engine has never played for anyone but us', () => {
    expect(getBackendKind()).toBe('rntp');
    expect(getBackend()).toBe(mockRntp);
  });

  it('builds the backend once and hands back the same one', () => {
    expect(getBackend()).toBe(getBackend());
    expect(mockRntpFactory).toHaveBeenCalledTimes(1);
  });

  it('switches to the engine when asked', () => {
    setBackendKind('engine');
    expect(getBackendKind()).toBe('engine');
    expect(getBackend()).toBe(mockEngine);
  });
});

describe('letting go of the outgoing player', () => {
  it('stops and clears it before switching', () => {
    getBackend();
    setBackendKind('engine');
    expect(mockRntp.stop).toHaveBeenCalled();
    expect(mockRntp.clear).toHaveBeenCalled();
  });

  it('switches even when the outgoing player throws on the way out', () => {
    getBackend();
    mockRntp.stop.mockImplementationOnce(() => {
      throw new Error('already gone');
    });
    setBackendKind('engine');
    // Failing here would leave the app on neither player, which is worse than
    // an unclean exit from one being discarded anyway.
    expect(getBackendKind()).toBe('engine');
    expect(getBackend()).toBe(mockEngine);
  });

  it('does nothing at all when asked for the player already in use', () => {
    getBackend();
    setBackendKind('rntp');
    expect(mockRntp.stop).not.toHaveBeenCalled();
  });

  it('does not touch a player that was never built', () => {
    // Switching before anything played must not construct rntp just to stop it.
    setBackendKind('engine');
    expect(mockRntpFactory).not.toHaveBeenCalled();
  });
});

describe('telling the hooks', () => {
  it('notifies subscribers so they can re-read', () => {
    const seen: string[] = [];
    subscribeBackendKind((kind: string) => seen.push(kind));
    setBackendKind('engine');
    expect(seen).toEqual(['engine']);
  });

  it('stops notifying after unsubscribe', () => {
    const seen: string[] = [];
    const off = subscribeBackendKind((kind: string) => seen.push(kind));
    off();
    setBackendKind('engine');
    expect(seen).toEqual([]);
  });
});
