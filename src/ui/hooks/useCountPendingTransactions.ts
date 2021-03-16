import {useEffect, useState} from 'react';
import {Transaction} from "../../core/models/Transaction";

export function useCountPendingTransactions(): number {
  const [nbPendingTransactions, setNbPendingTransactions] = useState<number>(0);
  useEffect(() => {
    window
      .api
      .countPendingTransactions()
      .then(setNbPendingTransactions as any)
      .catch(() => setNbPendingTransactions(0));
  }, []);
  return nbPendingTransactions;
}
