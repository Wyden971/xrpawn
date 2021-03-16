import { useEffect, useState } from 'react';
export function useCountPendingTransactions() {
    const [nbPendingTransactions, setNbPendingTransactions] = useState(0);
    useEffect(() => {
        window
            .api
            .countPendingTransactions()
            .then(setNbPendingTransactions)
            .catch(() => setNbPendingTransactions(0));
    }, []);
    return nbPendingTransactions;
}
