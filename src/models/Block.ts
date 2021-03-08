import SHA256 from 'crypto-js/sha256';
import {Transaction} from "./Transaction";
import {Security} from "./Security";
import {User} from "./User";
import {Loan} from "./Loan";
import {BlockData, BlockDataType} from "./BlockData";
import {Blockchain} from "./Blockchain";
import {ec as EC} from "elliptic";

export type AvailableBlockTransactionType = Transaction | Security | Loan | User;

export type BlockVote = {
  voterAddress: string;
  transaction: Transaction;
  value: string;
  signature: string;
}

export class Block {
  public index: number;
  public timestamp: number;
  public transactions: AvailableBlockTransactionType[];
  public validatorAddress: string;
  public previousHash: string;
  public hash: string;
  private nonce: number;
  private votes: BlockVote[] = [];
  private signature?: string;

  static definePrototypeOfTransaction(object: any) {
    let prototype: any;
    switch (object.type as BlockDataType) {
      case BlockDataType.security:
        prototype = Security.prototype;
        break;
      case BlockDataType.transaction:
        prototype = Transaction.prototype;
        break;
      case BlockDataType.loan:
        prototype = Loan.prototype;
        break;
      case BlockDataType.user:
        prototype = User.prototype;
        break;
    }
    if (prototype)
      return Object.setPrototypeOf(object, prototype);
  }

  constructor(index: number, timestamp: number, validatorAddress: string, transactions: AvailableBlockTransactionType[], previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.validatorAddress = validatorAddress;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  generateHash(includeVotes: boolean = false) {
    this.hash = this.calculateHash(includeVotes);
    return this;
  }


  getVotes() {
    if (!this.hasValidVotes()) {
      throw new Error('Invalid votes');
    }
    return [...this.votes ?? []];
  }

  hasValidVotes() {
    for (const vote of this.votes) {
      if (!this.isValidVote(vote))
        return false;
    }
    return true;
  }

  getVoteHash(voterAddress: string, transaction: Transaction, value: string) {
    return SHA256(`${voterAddress}${transaction.hash}${value}${this.hash}`).toString();
  }

  addVote(vote: BlockVote) {
    if (this.isValidVote(vote)) {
      const existingVote = this.votes.find((item) => item.voterAddress === vote.voterAddress);
      if (existingVote) {
        throw new Error('You cannot vote twice');
      }
      this.votes.push(vote);
    } else {
      throw new Error('you cannot add a not valid vote');
    }
  }

  getValidatorHash() {
    return SHA256(`${this.validatorAddress}${this.hash}`).toString();
  }

  isValidVote(vote: BlockVote) {
    const keyGen = BlockData.ec.keyFromPublic(vote.voterAddress, 'hex');
    if (!vote.transaction)
      return false;

    if (vote.transaction.toAddress !== Blockchain.escrow.publicKey)
      return false;

    if (this.getValidatorHash() !== vote.value)
      return false;

    return keyGen.verify(this.getVoteHash(vote.voterAddress, vote.transaction, vote.value), vote.signature);
  }

  getVoteResult() {
    const result = {
      ok: [] as BlockVote[],
      nok: [] as BlockVote[]
    }
    for (const vote of this.votes) {
      if (!this.isValidVote(vote)) {
        throw new Error('You cannot get the result with invalid vote');
      }

      const sig = BlockData.ec.keyFromPublic(vote.voterAddress, 'hex');

      if (sig.verify(this.getVoteHash(vote.voterAddress, vote.transaction, vote.value), vote.signature)) {
        result.ok.push(vote);
      } else {
        result.nok.push(vote);
      }
    }
    return result;
  }

  vote(signingKey: EC.KeyPair, transaction: Transaction): BlockVote {
    if (transaction.amount <= 0) {
      throw new Error('You cannot vote without money');
    }
    if (!`${transaction.signature ?? ''}`.trim().length) {
      throw new Error('You cannot vote without signed transaction');
    }
    this.mineBlock(Blockchain.difficulty);
    const voterAddress = signingKey.getPublic('hex');
    const value = this.getValidatorHash();
    const hash = this.getVoteHash(voterAddress, transaction, value)
    const signature = signingKey.sign(hash, 'base64').toDER('hex')
    const existingVote = this.votes.find((item) => item.voterAddress === voterAddress);

    if (existingVote) {
      throw new Error('You cannot vote twice');
    }

    return {
      voterAddress,
      signature,
      transaction,
      value
    }
  }

  calculateHash(includeVotes: boolean = false) {
    const transactions = this.transactions.map((transaction) => {
      Block.definePrototypeOfTransaction(transaction);
    });
    return SHA256(`${this.index}${this.previousHash}${this.timestamp}${this.validatorAddress}${includeVotes ? JSON.stringify(this.votes) : ''}${JSON.stringify(transactions)}${this.nonce}`).toString();
  }

  mineBlock(difficulty: number, includeVotes: boolean = false) {
    console.log('Mine block... ', this.index, includeVotes, this.calculateHash(includeVotes));
    while (!this.isCorrectHash(difficulty)) {
      this.nonce++;
      this.hash = this.calculateHash(includeVotes);
    }
    console.log('Mined block : ', this.index, this.hash);
  }

  isCorrectHash(difficulty: number) {
    return this.hash.substr(0, difficulty) === (new Array(difficulty + 1)).join('0')
  }

  isValidHash(includeVotes: boolean = false) {
    return this.hash === this.calculateHash(includeVotes);
  }

  hasValidSignature() {
    const publicKey = BlockData.ec.keyFromPublic(this.validatorAddress, 'hex');
    if (!this.signature?.length) {
      return false;
    }
    return publicKey.verify(this.calculateHash(true), this.signature!);
  }

  isValid(difficulty: number) {
    const result = (this.isCorrectHash(difficulty) && this.isValidHash(!!this.signature?.length));

    if (!this.signature?.length)
      return result;

    if (!result)
      return false;

    if (this.signature?.length && !this.votes.length)
      return false;

    return this.hasValidSignature();
  }

  hasValidTransactions() {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }
    return true;
  }

  sign(signingKey: EC.KeyPair) {
    if (signingKey.getPublic('hex') !== this.validatorAddress) {
      throw new Error('You cannot sign transaction for other validator');
    }

    if (!this.isValidHash()) {
      throw new Error('The block cannot be signed');
    }

    if (this.signature) {
      throw new Error('You cannot sign the block twice');
    }


    if (this.votes.length < 3) {
      throw new Error('You cannot sign the block with only 3 votes');
    }

    const result = this.getVoteResult();

    if (result.ok.length <= result.nok.length) {
      throw new Error('The block is not valid');
    }

    const transactions = [] as Transaction[];

    for (const vote of result.nok) {
      transactions.push(vote.transaction);
    }

    const totalToShare = transactions.reduce((result, tx) => result + tx.amount, 0);
    const total = result.ok.reduce((result, vote) => result + vote.transaction.amount, 0);

    for (const vote of result.ok) {
      if(vote.voterAddress === signingKey.getPublic('hex'))
        continue;

      const part = (vote.transaction.amount / total);
      const reward = part * totalToShare;
      const newTransaction = new Transaction(signingKey.getPublic('hex'), vote.voterAddress, reward);
      newTransaction.sign(signingKey);
    }

    this.transactions = [...this.transactions, ...transactions];
    this.hash = this.calculateHash(true);
    const sig = signingKey.sign(this.hash, 'base64');
    this.signature = sig.toDER('hex');
    return this;
  }

}
