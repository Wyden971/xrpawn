import SHA256 from 'crypto-js/sha256';
import {ec as EC} from "elliptic";
import {BlockData, BlockDataType} from "./BlockData";

export interface TransactionData {
  amount: number;
}

export class Transaction extends BlockData<TransactionData> implements TransactionData {
  public type = BlockDataType.transaction;
  public amount: number;

  constructor(fromAddress: string, toAddress: string, amount: number, id:string) {
    super(fromAddress, toAddress, id);
    this.amount = amount;
  }

  getData() {
    return {
      amount: this.amount,
    }
  }
}
