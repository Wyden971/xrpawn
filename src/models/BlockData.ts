import {ec as EC} from "elliptic";
import SHA256 from "crypto-js/sha256";
import {v4 as uuid4} from 'uuid'
import {AvailableBlockTransactionType} from "./Block";
import {Transaction} from "./Transaction";
import {Security} from "./Security";
import {Loan} from "./Loan";
import {User} from "./User";

export enum BlockDataType {
  "transaction" = "transaction",
  "security" = "security",
  "user" = "user",
  "loan" = "loan",
}


export abstract class BlockData<T> {
  static ec = new EC('secp256k1');
  public id?: string;
  public abstract type: BlockDataType;
  public fromAddress: string | null;
  public createdAt: number;
  public updatedAt?: number;
  public deletedAt?: number;
  public toAddress?: string;
  public signature?: string;
  public signature2?: string;
  public hash?: string;
  public previousHash?: string;

  constructor(fromAddress: string | null, toAddress?: string, id: string = uuid4()) {
    this.id = id;
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.createdAt = Date.now();
    this.updatedAt = this.createdAt;
  }

  public abstract getData(): T;

  public calculateHash() {
    return this.hashData(this.getData());
  }

  public isValid() {
    if (this.fromAddress === null)
      return true;

    if (this.hash !== this.calculateHash()) {
      throw new Error('Invalid hash');
    }

    if (!this.signature?.length) {
      throw new Error('No signature for this transaction');
    }
    const publicKey = BlockData.ec.keyFromPublic(this.fromAddress, 'hex');

    if (!this.signature2?.length) {
      return publicKey.verify(this.calculateHash(), this.signature!);
    } else if (this.previousHash && this.toAddress) {
      const publicKey2 = BlockData.ec.keyFromPublic(this.toAddress, 'hex');
      return publicKey.verify(this.previousHash, this.signature!) && publicKey2.verify(this.calculateHash(), this.signature2!);
    } else {
      return false;
    }
  }

  public sign(signingKey: EC.KeyPair) {
    const address = signingKey.getPublic('hex');
    if (!address || address === this.fromAddress) {
      if (this.fromAddress === null)
        return;
      return this.signAsFromAddress(signingKey);
    } else if (address === this.toAddress)
      return this.signAsToAddress(signingKey);
    else {
      throw new Error('You cannot sign for other wallets');
    }
  }

  private signAsFromAddress(signingKey: EC.KeyPair) {
    console.log('signAsFromAddress');
    if (signingKey.getPublic('hex') !== this.fromAddress) {
      throw new Error('You cannot sign transaction for other wallets');
    }
    this.hash = this.calculateHash();
    const sig = signingKey.sign(this.hash, 'base64');
    this.signature = sig.toDER('hex');
    return this;
  }

  private signAsToAddress(signingKey: EC.KeyPair) {
    console.log('signAsToAddress');
    if (!this.signature) {
      throw new Error('This transaction is not signed by the owner');
    }

    if (signingKey.getPublic('hex') !== this.toAddress) {
      throw new Error('You cannot sign transaction for other wallets');
    }
    this.hash = this.calculateHash();
    const sig = signingKey.sign(this.hash, 'base64');
    this.signature2 = sig.toDER('hex');
    return this;
  }

  protected hashData(data: any) {
    return SHA256(`${this.id ?? ''}${this.createdAt}${this.fromAddress}${this.toAddress ?? ''}${this.previousHash ?? ''}${this.deletedAt ?? ''}${JSON.stringify(data)}`).toString();
  }

}
