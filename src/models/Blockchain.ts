import {AvailableBlockTransactionType, Block} from "./Block";
import {Transaction} from "./Transaction";
import {Security} from "./Security";
import {BlockDataType} from "./BlockData";
import {Loan} from "./Loan";
import {ec as EC} from "elliptic";


export class Blockchain {
  public chain: Block[] = [];
  public static readonly difficulty: number = 1;
  public pendingTransactions: AvailableBlockTransactionType[];
  private miningReward: number = 100;
  static escrow = {
    publicKey: '04a78f9df9d68223fc980f14b111bd7d57c279de0a257c43fa389989fd958790836c5fe4222ec084481e362c00befa3a28cf7f1df76819d311d07b129ad8c7c2f5',
    privateKey: '049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b6'
  }

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.pendingTransactions = [];
  }

  createGenesisBlock() {
    return new Block(0, new Date().getTime(), '', []);
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  generateBlock(signingKey: EC.KeyPair): Block | undefined {
    const miningRewardAddress = signingKey.getPublic('hex');

    const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
    this.pendingTransactions.push(rewardTx);

    const block = new Block(this.chain.length, Date.now(), '', this.pendingTransactions, this.getLatestBlock().hash);
    block.mineBlock(Blockchain.difficulty);
    if (block.isValid(Blockchain.difficulty)) {
      return block;
    }
  }


  minePendingTransactions(signingKey: EC.KeyPair): Block {
    if (!this.pendingTransactions.length) {
      throw new Error('You doesnt have pending transactions');
    }

    const miningRewardAddress = signingKey.getPublic('hex');

    const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
    this.pendingTransactions.push(rewardTx);

    const block = new Block(this.chain.length, Date.now(), '', this.pendingTransactions, this.getLatestBlock().hash);
    block.vote(signingKey);

    console.log('voted : ', block.getVotes());
    console.log('block successfull mined : ', block.index);

    this.chain.push(block);
    this.pendingTransactions = [];

    return block;
  }

  addTransaction(transaction: Transaction) {
    if (!`${transaction.fromAddress ?? ''}`.trim().length || !`${transaction.toAddress ?? ''}`.trim().length) {
      throw new Error('fromAddress or toAdress could not be empty');
    }

    if (!transaction.isValid()) {
      throw new Error('You cannot add not valid transaction');
    }

    this.pendingTransactions.push(transaction);
  }

  getBalanceOfAddress(address: string) {
    let balance = 0;

    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.type === BlockDataType.transaction) {
          if (transaction.fromAddress === address) {
            balance -= (transaction as Transaction).amount;
          }

          if (transaction.toAddress === address) {
            balance += (transaction as Transaction).amount;
          }
        }
      }
    }

    return balance;
  }

  addBlock(newBlock: Block) {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.mineBlock(Blockchain.difficulty);
    this.chain.push(newBlock);
  }

  isChainValid() {

    for (let i = 1; i < this.chain.length; i++) {
      const previousBlock = this.chain[i - 1];
      const currentBlock = this.chain[i];

      if (!currentBlock.isValid(Blockchain.difficulty)) {
        console.warn('the current block is invalid because of difficulty : ', currentBlock.index);
        return false;
      }

      if (!currentBlock.hasValidTransactions()) {
        console.warn('the current block has invalid transactions : ', currentBlock.index);
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        console.warn('the current block hash is invalid', currentBlock.index);
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        console.warn('the current previous has doesnt match de correct  hash');
        return false;
      }
    }

    return true;
  }

  addSecurity(security: Security, signingKey: EC.KeyPair) {
    if (!security.id) {
      throw new Error('You cannot add security without id');
    }


    for (const tx of this.pendingTransactions) {
      if (tx.type === BlockDataType.security) {
        if (tx.id === security.id) {
          throw new Error('You cannot add same security in a block');
        }
      }
    }

    const existingSecurity = this.getTransactionById<Security>(security.id!);
    if (existingSecurity && existingSecurity?.fromAddress !== security.fromAddress)
      throw new Error('You cannot modify a security signed by someone else');

    security.previousHash = existingSecurity?.hash;
    security.sign(signingKey);

    if (!security.isValid()) {
      throw new Error('You cannot add not valid security');
    }
    this.pendingTransactions.push({...security} as AvailableBlockTransactionType);
  }

  addLoan(loan: Loan, signingKey: EC.KeyPair) {

    const existingPendingLooan = this.getPendingTransactionById<Loan>(loan.id!);
    if (existingPendingLooan) {
      throw new Error('You cannot add the same loan in a block');
    }

    const existingLoan = this.getTransactionById<Loan>(loan.id!);
    if (existingLoan && existingLoan?.fromAddress !== loan.fromAddress)
      throw new Error('You cannot modify a security signed by someone else');

    if (existingLoan?.signature && existingLoan?.signature2) {
      throw new Error('you cannot modify a both signed loan');
    }

    loan.previousHash = existingLoan?.hash;

    loan.sign(signingKey);
    if (!loan.isValid()) {
      throw new Error('you cannot add not valid loan');
    }

    this.pendingTransactions.push({...loan} as AvailableBlockTransactionType);
  }


  getTransactionById<T extends AvailableBlockTransactionType>(txId: string): T | undefined {
    let nextTx: T | undefined = undefined;
    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        const tx = transaction as T;
        if (txId === tx.id && (!nextTx || nextTx.hash === tx.previousHash)) {
          nextTx = tx
        }
      }
    }
    return Block.definePrototypeOfTransaction({...nextTx});
  }

  getPendingTransactionById<T extends AvailableBlockTransactionType>(txId: string): T | undefined {
    for (const tx of this.pendingTransactions) {
      if (tx.id === txId) {
        return (tx as T);
      }
    }
  }

}
