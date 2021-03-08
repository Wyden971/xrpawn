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
  value: string;
  asValidator: boolean;
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
    return [...this.votes ?? []];
  }


  hasValidVotes(blockchain: Blockchain) {
    const votes = this.votes.filter((vote) => this.isValidVote(vote, blockchain));

    if (votes.length < 3) {
      console.warn('3 votes are required')
      return false;
    }

    return true;
  }

  getVoteHash(voterAddress: string, value: string, asValidator: boolean) {
    return SHA256(`${voterAddress}${asValidator}${value}`).toString();
  }

  addVote(vote: BlockVote, blockchain: Blockchain) {
    if (this.isValidVote(vote, blockchain)) {
      const existingVote = this.votes.find((item) => item.voterAddress === vote.voterAddress);
      if (existingVote) {
        throw new Error('You cannot vote twice');
      }
      this.votes.push(vote);
    } else {
      throw new Error('you cannot add a not valid vote');
    }
  }

  isValidVote(vote: BlockVote, blockchain: Blockchain | null) {
    const keyGen = BlockData.ec.keyFromPublic(vote.voterAddress, 'hex');

    if (this.calculateHash() !== vote.value)
      return false;

    const validVoteResult = keyGen.verify(this.getVoteHash(vote.voterAddress, vote.value, vote.asValidator), vote.signature);
    if (!validVoteResult)
      return false;

    const amount = (blockchain && blockchain.getBalanceOfAddress(vote.voterAddress)) ?? 1;

    return (amount > 0);
  }

  getVoteResult(blockchain: Blockchain) {

    const votes = this.votes
      .map((vote) => ({
        ...vote,
        balance: blockchain.getBalanceOfAddress(vote.voterAddress)
      }))
      .filter((item) => item.balance > 0);

    if (votes.length < 3) {
      throw new Error('The minimum vote is 3');
    }

    ///A B B B C C C C C D A

    // 1A et 10B
    // 10000 1000


    const limit = 10000000;
    const total = votes.reduce((result, item) => result + item.balance, 0);

    const hashes = votes.reduce((result, item) => {
      return {
        ...result,
        [item.value]: [...(result[item.value] ?? []), ((item.balance / total) * limit)]
      }
    }, {} as {
      [name: string]: number[],
    });

    const orderedVotes = Object.keys(hashes).map((item) => {
      const hashItem = hashes[item];
      return ({
        hash: item,
        value: hashItem.length * hashItem.reduce((result, nextItem) => result + nextItem, 0)
      })
    })
      .sort((itemsA, itemsB) => {
        if (itemsA.value < itemsB.value) {
          return 1;
        } else if (itemsA.value > itemsB.value) {
          return -1;
        } else {
          return 0;
        }
      })

    return orderedVotes;
  }

  vote(signingKey: EC.KeyPair): BlockVote {
    const voterAddress = signingKey.getPublic('hex');
    const asValidator = (voterAddress === this.validatorAddress);

    const value = this.calculateHash();
    const hash = this.getVoteHash(voterAddress, value, asValidator)
    const signature = signingKey.sign(hash, 'base64').toDER('hex')
    const existingVote = this.votes.find((item) => item.voterAddress === voterAddress);

    if (existingVote) {
      throw new Error('You cannot vote twice');
    }

    return {
      voterAddress,
      signature,
      value,
      asValidator
    }
  }

  calculateHash(includeVotes: boolean = false) {
    const transactions = this.transactions.map((transaction) => Block.definePrototypeOfTransaction(transaction));

    return SHA256(`${this.index}${this.previousHash}${this.timestamp}${this.validatorAddress}${includeVotes ? JSON.stringify(this.votes) : ''}${JSON.stringify(transactions)}${includeVotes ? this.nonce : ''}`).toString();
  }

  mineBlock(difficulty: number, includeVotes: boolean = false) {
    console.log('Mine block... ', this.index, includeVotes, this.calculateHash(includeVotes));
    while (!this.isCorrectHash(difficulty)) {
      this.nonce++;
      this.hash = this.calculateHash(includeVotes);
    }
    console.log('Mined block : ', this.index, this.hash, includeVotes);
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
      console.warn('no signature');
      return false;
    }
    const result = publicKey.verify(this.calculateHash(true), this.signature!);
    if (!result) {
      console.warn('Bad signature');
    }
    return result;
  }

  isValid(difficulty: number) {
    const result = (this.isCorrectHash(difficulty) && this.isValidHash(!!this.signature?.length));

    if (!this.signature?.length) {
      if (!result)
        console.warn('not signed');
      return result;
    }

    if (!result) {
      console.log('incorrect hash');
      return false;
    }

    if (this.signature?.length && !this.votes.length) {
      console.warn('no votes');
      return false;
    }

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

    if (!this.isValidHash(this.index > 0)) {
      throw new Error('The block cannot be signed');
    }

    if (this.signature && !signingKey.verify(this.hash, this.signature)) {
      throw new Error('You cannot sign the block you are not a validator');
    }

    this.hash = this.calculateHash(this.index > 0);
    const sig = signingKey.sign(this.hash, 'base64');
    this.signature = sig.toDER('hex');
    return this;
  }

}
