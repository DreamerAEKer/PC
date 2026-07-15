/**
 * Merge Firestore orders into the local history cache.
 *
 * Local printed/deleted flags are preserved to avoid a delayed Firestore
 * snapshot undoing an action that the user has just completed.
 */
export function mergeOrderHistory(previousHistory, incomingOrders) {
  const previous = Array.isArray(previousHistory) ? previousHistory : [];
  const incoming = Array.isArray(incomingOrders) ? incomingOrders : [];
  const mergedMap = new Map(previous.map((record) => [record.id, record]));
  let hasNew = false;

  incoming.forEach((order) => {
    if (!mergedMap.has(order.id)) hasNew = true;

    const existing = mergedMap.get(order.id);
    const mergedRecord = { ...existing, ...order };

    if (existing?.printed && !order.printed) {
      mergedRecord.printed = true;
    }
    if (existing?.deleted && !order.deleted) {
      mergedRecord.deleted = true;
    }

    mergedMap.set(order.id, mergedRecord);
  });

  const history = Array.from(mergedMap.values());
  history.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

  return { history, hasNew };
}
