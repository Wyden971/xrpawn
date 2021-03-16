import { useEffect, useState } from 'react';
export function useCountTransactions() {
    const [nbTransactions, setNbTransactions] = useState(0);
    useEffect(() => {
        window
            .api
            .countTransactions()
            .then(setNbTransactions)
            .catch(() => setNbTransactions(0));
    }, []);
    return nbTransactions;
}
