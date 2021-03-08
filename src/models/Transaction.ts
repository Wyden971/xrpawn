import SHA256 from 'crypto-js/sha256';
import {ec as EC} from "elliptic";
import {BlockData, BlockDataType} from "./BlockData";

export interface TransactionData {
  amount: number;
}

export class Transaction extends BlockData<TransactionData> implements TransactionData {
  public type = BlockDataType.transaction;
  public amount: number;

  constructor(fromAddress: string | null, toAddress: string, amount: number) {
    super(fromAddress, toAddress);
    this.amount = amount;
  }

  getData() {
    return {
      amount: this.amount,
    }
  }
}
