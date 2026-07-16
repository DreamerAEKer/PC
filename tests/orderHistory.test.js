import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHistoryMigration, buildFirestoreOrder, getHistoryLookupValues, markOrderPendingUpdate, mergeOrderHistory } from '../src/utils/orderHistory.js';

test('adds new orders and sorts newest first', () => {
  const result = mergeOrderHistory([{ id: 100, name: 'เดิม' }], [{ id: 200, name: 'ใหม่' }]);
  assert.equal(result.hasNew, true);
  assert.deepEqual(result.history.map((record) => record.id), [200, 100]);
});

test('Firestore overrides legacy cache flags so restore works across devices', () => {
  const result = mergeOrderHistory(
    [{ id: 100, firestoreId: 'a', printed: true, deleted: true }],
    [{ id: 100, firestoreId: 'a', printed: false, deleted: false }],
  );
  assert.equal(result.history[0].printed, false);
  assert.equal(result.history[0].deleted, false);
});

test('keeps an optimistic action while an older snapshot is arriving', () => {
  const cached = markOrderPendingUpdate(
    { id: 100, firestoreId: 'a', printed: false, updatedAt: 1000 },
    { printed: true },
  );
  const result = mergeOrderHistory([cached], [
    { id: 100, firestoreId: 'a', printed: false, updatedAt: 1000 },
  ]);
  assert.equal(result.history[0].printed, true);
  assert.ok(result.history[0]._pendingHistoryUpdate);
});

test('accepts a newer Firestore action from another device', () => {
  const cached = markOrderPendingUpdate(
    { id: 100, firestoreId: 'a', deleted: false, updatedAt: 1000 },
    { deleted: true },
  );
  const result = mergeOrderHistory([cached], [
    { id: 100, firestoreId: 'a', deleted: false, updatedAt: 2000 },
  ]);
  assert.equal(result.history[0].deleted, false);
  assert.equal(result.history[0]._pendingHistoryUpdate, undefined);
});

test('clears pending state when Firestore confirms printed, delete, and restore', () => {
  for (const changes of [{ printed: true }, { deleted: true }, { deleted: false }]) {
    const cached = markOrderPendingUpdate(
      { id: 100, firestoreId: 'a', printed: false, deleted: false, updatedAt: 1000 },
      changes,
    );
    const result = mergeOrderHistory([cached], [
      { id: 100, firestoreId: 'a', printed: changes.printed ?? false, deleted: changes.deleted ?? false, updatedAt: 2000 },
    ]);
    assert.equal(result.history[0]._pendingHistoryUpdate, undefined);
  }
});

test('removes Firestore-backed records absent from the authoritative snapshot', () => {
  const result = mergeOrderHistory(
    [{ id: 100, firestoreId: 'removed' }, { id: 200, name: 'local only' }],
    [],
  );
  assert.deepEqual(result.history.map((record) => record.id), [200]);
});

test('hides permanently deleted Firestore tombstones on every device', () => {
  const result = mergeOrderHistory(
    [{ id: 100, firestoreId: 'trash', deleted: true }],
    [{ id: 100, firestoreId: 'trash', deleted: true, purged: true }],
  );

  assert.deepEqual(result.history, []);
});

test('finds stable lookup values for legacy records without a Firestore id', () => {
  assert.deepEqual(
    getHistoryLookupValues({ id: 123, orderCode: '  PC-123  ' }),
    { id: 123, orderCode: 'PC-123' },
  );
  assert.deepEqual(getHistoryLookupValues({}), { id: null, orderCode: null });
});

test('accepts missing or invalid local history safely', () => {
  const result = mergeOrderHistory(null, [{ id: 100 }]);
  assert.deepEqual(result.history, [{ id: 100 }]);
});

test('builds a cross-device Firestore record for a newly created order', () => {
  const record = buildFirestoreOrder(
    { id: 123, name: 'ลูกค้า', printed: false, firestoreId: 'cache-only', _pendingHistoryUpdate: {} },
    { dept: '10501', createdAt: 'created', updatedAt: 'updated' },
  );
  assert.deepEqual(record, {
    id: 123,
    name: 'ลูกค้า',
    printed: false,
    dept: '10501',
    deleted: false,
    createdAt: 'created',
    updatedAt: 'updated',
  });
});

test('migration creates only records missing from Firestore history', () => {
  const result = analyzeHistoryMigration(
    [{ id: 1, firestoreId: 'remote-1' }, { id: 2, orderCode: 'PC-2' }],
    [{ id: 1, firestoreId: 'remote-1' }, { id: 2, orderCode: 'PC-2' }, { id: 3 }, { id: 4, deleted: true }],
  );
  assert.deepEqual(result.toCreate.map((record) => record.id), [3, 4]);
  assert.deepEqual(result.skipped.map((record) => record.id), [1, 2]);
});

test('migration rejects duplicate and unidentifiable imported records', () => {
  const result = analyzeHistoryMigration([], [{ id: 3 }, { id: 3 }, { name: 'missing id' }]);
  assert.deepEqual(result.toCreate.map((record) => record.id), [3]);
  assert.equal(result.skipped.length, 2);
});
