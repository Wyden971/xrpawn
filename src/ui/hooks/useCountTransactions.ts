import {useEffect, useState} from 'react';
import {Transaction} from "../../core/models/Transaction";

export function useCountTransactions(): number {
  const [nbTransactions, setNbTransactions] = useState<number>(0);
  useEffect(() => {
    window
      .api
      .countTransactions()
      .then(setNbTransactions as any)
      .catch(() => setNbTransactions(0));
  }, []);
  return nbTransactions;
}
