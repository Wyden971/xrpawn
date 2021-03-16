import {ipcRenderer} from 'electron';
import {Transaction} from "./models/Transaction";
import {Block} from "./models/Block";
import {Blockchain} from "./models/Blockchain";

export type Api = {
  getBlocks: () => Promise<Block[]>;
  getBlockchain: () => Promise<Blockchain>;
  getAddress: () => Promise<string>;
  getBalanceOfAddresses: (addresses: string[] | string) => Promise<string>;
  getTransactions: (offset?: number, limit?: number) => Promise<Transaction[]>;
  getPendingTransactions: (offset?: number, limit?: number) => Promise<string>;
  countTransactions: () => Promise<number>;
  countPendingTransactions: () => Promise<number>;
}

declare global {
  interface Window {
    api: Api
  }
}


function registerApi(name: keyof Api) {
  return {[name]: (...args: any): ReturnType<Api[typeof name]> => ipcRenderer.invoke(name, ...args)};
}

export default {
  ...registerApi('getBlocks'),
  ...registerApi('getBlockchain'),
  ...registerApi('getAddress'),
  ...registerApi('getBalanceOfAddresses'),
  ...registerApi('getTransactions'),
  ...registerApi('getPendingTransactions'),
  ...registerApi('countTransactions'),
  ...registerApi('countPendingTransactions'),
} as Api;
