import { notify, getToasts, __resetToasts } from './notify';

describe('notify store', () => {
  beforeEach(() => __resetToasts());

  it('adds a toast and returns a stable non-empty id', () => {
    const id = notify.success('Saved');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0]).toMatchObject({ message: 'Saved', variant: 'success' });
  });

  it('reuses the id passed in options and updates in place (no stacking)', () => {
    const first = notify.loading('Working…', { id: 'job-1' });
    const second = notify.success('Done', { id: 'job-1' });
    expect(first).toBe('job-1');
    expect(second).toBe('job-1');
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0]).toMatchObject({ message: 'Done', variant: 'success' });
  });

  it('applies finite defaults for success/error/info and Infinity for loading', () => {
    notify.success('a', { id: 'a' });
    notify.error('b', { id: 'b' });
    notify.loading('d', { id: 'd' });
    const byId = Object.fromEntries(getToasts().map(t => [t.id, t.duration]));
    expect(Number.isFinite(byId.a)).toBe(true);
    expect(Number.isFinite(byId.b)).toBe(true);
    expect(byId.d).toBe(Infinity);
    // error stays visible longer than success.
    expect(byId.b).toBeGreaterThan(byId.a);
  });

  it('caps the visible stack at 3, dropping the oldest', () => {
    notify.info('1', { id: '1' });
    notify.info('2', { id: '2' });
    notify.info('3', { id: '3' });
    notify.info('4', { id: '4' });
    const ids = getToasts().map(t => t.id);
    expect(ids).toEqual(['2', '3', '4']);
  });

  it('sorts oldest-first by sequence', () => {
    notify.info('first', { id: 'x' });
    notify.info('second', { id: 'y' });
    expect(getToasts().map(t => t.message)).toEqual(['first', 'second']);
  });

  it('dismiss removes one id and is idempotent', () => {
    notify.error('Failed', { id: 'e1' });
    notify.dismiss('e1');
    expect(getToasts()).toHaveLength(0);
    notify.dismiss('e1'); // no throw, no change
    expect(getToasts()).toHaveLength(0);
  });

  it('dismissAll clears everything', () => {
    notify.info('a', { id: 'a' });
    notify.info('b', { id: 'b' });
    notify.dismissAll();
    expect(getToasts()).toHaveLength(0);
  });

  it('carries an action through to the stored toast', () => {
    const onPress = jest.fn();
    notify.success('Removed', { id: 'r', action: { label: 'Undo', onPress } });
    expect(getToasts()[0].action?.label).toBe('Undo');
    getToasts()[0].action?.onPress();
    expect(onPress).toHaveBeenCalled();
  });
});
