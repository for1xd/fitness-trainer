import { enqueueOp, mergeLww, removeSent, type OutboxOp } from './outbox';

const op = (id: string, queuedAt: number, table: OutboxOp['table'] = 'meal_entries'): OutboxOp => ({
  table,
  id,
  row: { id, v: queuedAt },
  queuedAt,
});

describe('outbox', () => {
  it('залишає лише останню версію запису', () => {
    let q: OutboxOp[] = [];
    q = enqueueOp(q, op('a', 1));
    q = enqueueOp(q, op('b', 2));
    q = enqueueOp(q, op('a', 3));
    q = enqueueOp(q, op('a', 4, 'water_entries'));
    expect(q.map((x) => `${x.table}:${x.id}:${x.queuedAt}`)).toEqual([
      'meal_entries:b:2',
      'meal_entries:a:3',
      'water_entries:a:4',
    ]);
  });

  it('не прибирає запис, змінений під час відправки', () => {
    const sent = [op('a', 1), op('b', 2)];
    const queue = [op('b', 2), op('a', 5)];
    expect(removeSent(queue, sent)).toEqual([op('a', 5)]);
  });
});

describe('mergeLww', () => {
  it('новіший запис перемагає, видалені прибираються', () => {
    const local = [
      { id: '1', updatedAt: '2026-11-04T10:00:00Z', v: 'local' },
      { id: '2', updatedAt: '2026-11-04T10:00:00Z', v: 'local' },
      { id: '3', updatedAt: '2026-11-04T10:00:00Z', v: 'local' },
    ];
    const remote = [
      { id: '1', updatedAt: '2026-11-04T11:00:00Z', v: 'remote' },
      { id: '2', updatedAt: '2026-11-04T09:00:00Z', v: 'remote' },
      { id: '4', updatedAt: '2026-11-04T09:00:00Z', v: 'remote' },
    ];
    const merged = mergeLww(local, remote, ['3']);
    expect(Object.fromEntries(merged.map((x) => [x.id, x.v]))).toEqual({
      '1': 'remote',
      '2': 'local',
      '4': 'remote',
    });
  });
});
