const toMillis = (value) => {
  if (value == null) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') {
    return (value.seconds * 1000) + Math.floor((value.nanoseconds || 0) / 1e6);
  }
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export function markOrderPendingUpdate(record, changes) {
  const cleanRecord = record && typeof record === 'object' ? record : {};
  return {
    ...cleanRecord,
    ...changes,
    _pendingHistoryUpdate: {
      baseUpdatedAt: toMillis(cleanRecord.updatedAt),
      changes: { ...changes },
    },
  };
}

export function buildFirestoreOrder(record, { dept, createdAt, updatedAt }) {
  const { firestoreId, _pendingHistoryUpdate, ...data } = record;
  return {
    ...data,
    dept: data.dept || dept,
    deleted: data.deleted ?? false,
    createdAt,
    updatedAt,
  };
}

/** Stable values used to find legacy history records without a Firestore id. */
export function getHistoryLookupValues(record) {
  return {
    id: record?.id ?? null,
    orderCode: typeof record?.orderCode === 'string' && record.orderCode.trim()
      ? record.orderCode.trim()
      : null,
  };
}

const recordKeys = (record) => {
  const keys = [];
  if (record?.firestoreId) keys.push(`firestore:${record.firestoreId}`);
  if (record?.id != null) keys.push(`id:${record.id}`);
  if (record?.orderCode) keys.push(`order:${record.orderCode}`);
  return keys;
};

export function analyzeHistoryMigration(existingHistory, importedHistory) {
  const existing = Array.isArray(existingHistory) ? existingHistory : [];
  const imported = Array.isArray(importedHistory) ? importedHistory.filter(Boolean) : [];
  const existingKeys = new Set(existing.flatMap(recordKeys));
  const seenImportKeys = new Set();
  const toCreate = [];
  const skipped = [];

  imported.forEach((record) => {
    const keys = recordKeys(record);
    const duplicate = keys.length === 0
      || keys.some((key) => existingKeys.has(key) || seenImportKeys.has(key));
    if (duplicate) {
      skipped.push(record);
      return;
    }
    keys.forEach((key) => seenImportKeys.add(key));
    toCreate.push(record);
  });
  return { total: imported.length, toCreate, skipped };
}

const mergeRecord = (existing, incoming) => {
  if (!existing) return incoming;

  const pending = existing._pendingHistoryUpdate;
  if (pending) {
    const confirmed = Object.entries(pending.changes).every(
      ([key, value]) => incoming[key] === value,
    );
    const hasNewerServerState = toMillis(incoming.updatedAt) > pending.baseUpdatedAt;

    if (!confirmed && !hasNewerServerState) {
      return { ...existing, ...incoming, ...pending.changes, _pendingHistoryUpdate: pending };
    }
  }

  // Firestore is authoritative. This also lets legacy records without
  // updatedAt restore correctly instead of preserving stale cache flags.
  const merged = { ...existing, ...incoming };
  delete merged._pendingHistoryUpdate;
  return merged;
};

/** Merge an authoritative Firestore snapshot into the local cache. */
export function mergeOrderHistory(previousHistory, incomingOrders) {
  const previous = Array.isArray(previousHistory) ? previousHistory : [];
  // Keep a Firestore tombstone for permanent deletion. This works with
  // deployments whose security rules allow updates but not document deletes.
  const incoming = (Array.isArray(incomingOrders) ? incomingOrders : [])
    .filter((record) => record?.purged !== true);
  const previousMap = new Map(previous.map((record) => [record.id, record]));
  const incomingIds = new Set(incoming.map((record) => record.id));
  let hasNew = false;

  const history = incoming.map((order) => {
    const existing = previousMap.get(order.id);
    if (!existing) hasNew = true;
    return mergeRecord(existing, order);
  });

  // Records created only on this device are retained for compatibility.
  // Firestore-backed records absent from the snapshot are removed from cache.
  previous.forEach((record) => {
    if (!record.firestoreId && !incomingIds.has(record.id)) history.push(record);
  });

  history.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  return { history, hasNew };
}
