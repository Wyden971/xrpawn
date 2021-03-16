import { useEffect, useState } from 'react';
export function usePendingTransactions(offset = 0, limit = 10) {
    const [pendingTransactions, setPendingTransactions] = useState([]);
    useEffect(() => {
        window
            .api
            .getPendingTransactions(offset, limit)
            .then(setPendingTransactions)
            .catch(() => setPendingTransactions([]));
    }, [offset, limit]);
    return pendingTransactions;
}
