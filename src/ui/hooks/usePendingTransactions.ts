import {useEffect, useState} from 'react';
import {Transaction} from "../../core/models/Transaction";

export function usePendingTransactions(offset: number = 0, limit: number = 10): Transaction[] {
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  useEffect(() => {
    window
      .api
      .getPendingTransactions(offset, limit)
      .then(setPendingTransactions as any)
      .catch(() => setPendingTransactions([]));
  }, [offset, limit]);
  return pendingTransactions;
}
