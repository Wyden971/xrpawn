import { useEffect, useState } from 'react';
export function useAddress() {
    const [address, setAddress] = useState();
    useEffect(() => {
        window
            .api
            .getAddress()
            .then(setAddress)
            .catch(() => setAddress(undefined));
    }, []);
    return address;
}
