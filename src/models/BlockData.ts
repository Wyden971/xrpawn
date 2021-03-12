import {ec as EC} from "elliptic";
import SHA256 from "crypto-js/sha256";
import {v4 as uuid4} from 'uuid'
import {AvailableBlockTransactionType} from "./Block";
import {Transaction} from "./Transaction";
import {Security} from "./Security";
import {Loan} from "./Loan";
import {User} from "./User";
import {Balances, Blockchain} from "./Blockchain";

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
  public fromAddress: string;
  public toAddress: string;
  public createdAt: number;
  public updatedAt?: number;
  public deletedAt?: number;
  public signature?: string;
  public signature2?: string;
  public hash?: string;
  public previousHash?: string;

  constructor(fromAddress: string, toAddress: string, id: string) {
    this.id = id;
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.createdAt = Math.round(Date.now() / 1000);
    this.updatedAt = Math.round(Date.now() / 1000);
  }

  public abstract getData(): T;

  public calculateHash() {
    return this.hashData(this.getData());
  }

  public isValid() {
    if (this.fromAddress === null)
      return true;

    if (this.hash !== this.calculateHash()) {
      throw new Error('Invalid hash : ' + this.hash);
    }

    if (!this.signature?.length) {
      throw new Error('No signature for this transaction');
    }
    const publicKey = BlockData.ec.keyFromPublic(this.fromAddress, 'hex');

    if (!this.signature2?.length) {
      return publicKey.verify(this.hash, this.signature!);
    } else if (this.previousHash && this.toAddress) {
      const publicKey2 = BlockData.ec.keyFromPublic(this.toAddress, 'hex');
      return publicKey.verify(this.previousHash, this.signature!) && publicKey2.verify(this.hash, this.signature2!);
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
    const dataToHash = `${this.id}/${this.createdAt}/${this.fromAddress}/${this.toAddress}/${this.previousHash ?? null}/${this.deletedAt ?? null}/${JSON.stringify(data)}`;
    return SHA256(dataToHash).toString();
  }

  asTransaction() {
    return ((this as any) as Transaction);
  }

  asLoan() {
    return ((this as any) as Loan);
  }

  asSecurity() {
    return ((this as any) as Security);
  }

  getSqlData() {
    const data = {
      id: this.id,
      type: this.type,
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      signature: this.signature,
      signature2: this.signature2 ?? null,
      hash: this.hash,
      previousHash: this.previousHash ?? null,
      ...this.getData()
    };
    return data;
  }

  getInsertSQL(table: string) {
    const data = this.getSqlData();
    const keys = Object.keys(data).join(',');
    const values = Object.values(data).map((item) => item ?? null);
    const valuesPlace = values.map((item) => '?').join(',');
    return {
      query: `INSERT INTO \`${table}\` (${keys}) VALUES (${valuesPlace});`,
      variables: values
    };
  }

  check(balances: Balances, inGenesisBlock: boolean = false) {
    const oldBalances = {...balances};
    switch (this.type) {
      case BlockDataType.transaction:
        const amount = this.asTransaction().amount - (inGenesisBlock ? 0 : Blockchain.STATIC_FEE);
        if (!inGenesisBlock)
          balances[this.fromAddress] = (balances[this.fromAddress] ?? 0) - amount;
        balances[this.toAddress] = (balances[this.toAddress] ?? 0) + amount;
        break;

      case BlockDataType.loan:
        balances[this.fromAddress] = (balances[this.fromAddress] ?? 0) - Blockchain.STATIC_FEE;
        break;
    }

    if (!inGenesisBlock && balances[this.fromAddress] <= 0) {
      Object.assign(balances, oldBalances);
      return false;
    }
    return true;
  }

}
