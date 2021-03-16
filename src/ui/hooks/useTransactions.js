import { useEffect, useState } from 'react';
export function useTransactions(offset = 0, limit = 10) {
    const [transactions, setTransactions] = useState([]);
    useEffect(() => {
        window
            .api
            .getTransactions(offset, limit)
            .then(setTransactions)
            .catch(() => setTransactions([]));
    }, [offset, limit]);
    return transactions;
}
