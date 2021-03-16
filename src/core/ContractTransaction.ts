import {Contract} from "./Contract";
import {Signable} from "./Signable";
import {Balances} from "./types";

type ContractData = {
  fct: string,
  args: any[],
  contract: Contract
} | null;

export class ContractTransaction extends Signable {
  sequence: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  data?: ContractData;
  createdAt: number;

  constructor(sequence: number, fromAddress: string, toAddress: string, amount: number, data?: ContractData) {
    super();
    this.sequence = sequence;
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.data = data;
    this.createdAt = Date.now();
    this.calculateHash();
  }

  getPublicKey() {
    return this.fromAddress;
  }

  getHashingData() {
    return {
      sequence: this.sequence,
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      amount: this.amount,
      data: this.data ?? null,
      hash: this.getHash(),
      createdAt: this.createdAt,
    }
  }

  getBalances(balances: Balances, fee: number = 20) {
    const fromAddressBalance = (balances[this.fromAddress] ?? 0) - this.amount - fee;
    const toAddressBalance = (balances[this.toAddress] ?? 0) + this.amount;
    if (fromAddressBalance < 0) {
      throw new Error('Invalid balances');
    }
    if (!this.data) {
      return {
        ...balances,
        [this.fromAddress]: fromAddressBalance,
        [this.toAddress]: toAddressBalance,
      };
    } else {
      if (this.data.contract.address !== this.fromAddress) {
        throw new Error('The fromAddress doesnt match the contract');
      }
      const nextBalance = {
        ...balances,
        [this.fromAddress]: fromAddressBalance,
        [this.toAddress]: toAddressBalance,
      };
      const contractResult = this.data
        .contract
        .execute(
          {},
          this.fromAddress,
          this.data.fct,
          this.data.args,
          toAddressBalance,
          this.amount
        );

      for (const address in contractResult.balances) {
        if (address === this.toAddress) {
          nextBalance[address] = contractResult.balances[address];
          if (nextBalance[address] < 0) {
            throw new Error('The balance cannot be less than zero');
          }
        } else {
          nextBalance[address] += contractResult.balances[address];
        }
      }
      return contractResult.balances;
    }
  }
}
