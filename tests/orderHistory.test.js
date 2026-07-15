import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeOrderHistory } from '../src/utils/orderHistory.js';

test('adds new orders and sorts newest first', () => {
  const result = mergeOrderHistory([{ id: 100, name: 'เดิม' }], [{ id: 200, name: 'ใหม่' }]);
  assert.equal(result.hasNew, true);
  assert.deepEqual(result.history.map((record) => record.id), [200, 100]);
});

test('updates an existing order with fresh Firestore data', () => {
  const result = mergeOrderHistory(
    [{ id: 100, name: 'ชื่อเดิม', quantity: 1 }],
    [{ id: 100, name: 'ชื่อใหม่', quantity: 2 }],
  );
  assert.equal(result.hasNew, false);
  assert.equal(result.history[0].name, 'ชื่อใหม่');
  assert.equal(result.history[0].quantity, 2);
});

test('preserves a local printed flag during a delayed snapshot', () => {
  const result = mergeOrderHistory([{ id: 100, printed: true }], [{ id: 100, printed: false }]);
  assert.equal(result.history[0].printed, true);
});

test('preserves a local deleted flag during a delayed snapshot', () => {
  const result = mergeOrderHistory([{ id: 100, deleted: true }], [{ id: 100, deleted: false }]);
  assert.equal(result.history[0].deleted, true);
});

test('accepts missing or invalid local history safely', () => {
  const result = mergeOrderHistory(null, [{ id: 100 }]);
  assert.deepEqual(result.history, [{ id: 100 }]);
});
