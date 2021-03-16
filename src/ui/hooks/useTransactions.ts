import {useEffect, useState} from 'react';
import {Transaction} from "../../core/models/Transaction";

export function useTransactions(offset: number = 0, limit: number = 10): Transaction[] {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  useEffect(() => {
    window
      .api
      .getTransactions(offset, limit)
      .then(setTransactions as any)
      .catch(() => setTransactions([]));
  }, [offset, limit]);
  return transactions;
}
