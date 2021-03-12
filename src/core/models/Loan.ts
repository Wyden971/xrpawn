import SHA256 from 'crypto-js/sha256';
import {ec as EC} from "elliptic";
import {v4 as uuid4, parse as uuidParse} from 'uuid'
import {BlockData, BlockDataType} from "./BlockData";

const ec = new EC('secp256k1');

export interface LoanData {
  securityId: string;
  expiresAt: number;
  startAt: number;
  endAt: number;
  rate: number;
  amount: number;
  interest: number;

  acceptedAt?: number;
  refusedAt?: number;
}


export class Loan extends BlockData<LoanData> implements LoanData {
  public type = BlockDataType.loan;
  public securityId: string;
  public expiresAt: number;
  public startAt: number;
  public endAt: number;
  public rate: number;
  public amount: number;
  public interest: number;
  public acceptedAt?: number;
  public refusedAt?: number;

  constructor(fromAddress: string, toAddress: string, data: LoanData, id: string) {

    super(fromAddress, toAddress, id);

    this.securityId = data.securityId;
    this.expiresAt = data.expiresAt;
    this.startAt = data.startAt;
    this.endAt = data.endAt;
    this.rate = data.rate;
    this.amount = data.amount;
    this.interest = data.interest;
    this.acceptedAt = data.acceptedAt;
    this.refusedAt = data.refusedAt;
  }

  getData() {
    return {
      securityId: this.securityId,
      expiresAt: this.expiresAt,
      startAt: this.startAt,
      endAt: this.endAt,
      rate: this.rate,
      amount: this.amount,
      interest: this.interest,
      acceptedAt: this.acceptedAt,
      refusedAt: this.refusedAt,
    }
  }

  isValid() {
    if (!this.signature?.length) {
      throw new Error('No signature for this transaction');
    }

    const isBlockDataValid = super.isValid();

    if (!this.toAddress) {
      console.log('toAddress is required');
      return isBlockDataValid;
    }

    if (!isBlockDataValid) {
      console.log('Loan is invalid');
      return false;
    }

    if (!this.signature2?.length && !this.acceptedAt)
      return true;

    if ((!this.signature2?.length && (this.acceptedAt || this.refusedAt)) || (this.signature2?.length && !this.acceptedAt && !this.refusedAt)) {
      throw new Error('You cannot sign without accept or refuse the Loan');
    }

    if (this.acceptedAt && this.refusedAt) {
      throw new Error('You cannot accept and refuse the Loan');
      return false;
    }

    const publicKey2 = ec.keyFromPublic(this.toAddress!, 'hex');
    return publicKey2.verify(this.calculateHash(), this.signature2!);
  }
}

