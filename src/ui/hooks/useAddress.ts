import {useEffect, useState} from 'react';
import {Transaction} from "../../core/models/Transaction";

export function useAddress(): string | undefined {
  const [address, setAddress] = useState<string>();
  useEffect(() => {
    window
      .api
      .getAddress()
      .then(setAddress as any)
      .catch(() => setAddress(undefined));
  }, []);
  return address;
}
