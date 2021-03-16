import {AvailableBlockTransactionType, Block} from "./Block";
import {Transaction} from "./Transaction";
import {Security} from "./Security";
import {BlockData, BlockDataType} from "./BlockData";
import {Loan} from "./Loan";
import {ec as EC} from "elliptic";
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import genesisBlock from "../genesisBlock";
import {User} from "./User";
import {EventEmitter} from 'events';

export type Balances = { [address: string]: number };

export class Blockchain extends EventEmitter {
  public static readonly TABLE_BLOCKS = 'blocks';
  public static readonly TABLE_BALANCES = 'balances';
  public static readonly TABLE_PENDING_TRANSACTIONS = 'pending_transactions';
  public static readonly TABLE_TRANSACTIONS = 'transactions';
  public static readonly ROOT_ADDRESS = '04a78f9df9d68223fc980f14b111bd7d57c279de0a257c43fa389989fd958790836c5fe4222ec084481e362c00befa3a28cf7f1df76819d311d07b129ad8c7c2f5';
  public static readonly STATIC_FEE = 0.0002;
  public static readonly REWARD = 0.01;

  public chain: Block[] = [];
  public pendingTransactions: AvailableBlockTransactionType[];
  private miningReward: number = 100;
  private readonly db: sqlite3.Database;
  private readonly signingKey: EC.KeyPair;

  static escrow = {
    publicKey: '04a78f9df9d68223fc980f14b111bd7d57c279de0a257c43fa389989fd958790836c5fe4222ec084481e362c00befa3a28cf7f1df76819d311d07b129ad8c7c2f5',
    privateKey: '049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b6'
  }

  constructor(signingKey: EC.KeyPair) {
    super();
    this.pendingTransactions = [];
    this.signingKey = signingKey;

    const dbPath = path.join(__dirname, '../db');
    try {
      fs.mkdirSync(dbPath);
    } catch (e) {

    }

    this.db = new sqlite3.Database(path.join(dbPath, 'blockchain.db'), (err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Connected to the blockchain database.');
    });

    this.db.on('open', () => {
      console.log('opened');
      this.init();
    })
  }

  stop() {
    this.db.close((err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Close the database connection.');
    });
  }

  private init() {
    this.db.serialize(async () => {
      await this.createBlocksTableIfNotExists();
      await this.createBalancesTableIfNotExists();
      await this.createTransactionsTableIfNotExists();

      await this.createGenesisBlock();
      await this.checkDatabaseBlocks();

      this.emit('ready', this.getBalance());
    });
  }

  public on(event: 'ready', listener: (...args: any[]) => void): this;
  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  private createBlocksTableIfNotExists(): Promise<void> {
    console.log('create blocks database');
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS \`${Blockchain.TABLE_BLOCKS}\`(
            id INT PRIMARY KEY NOT NULL,
            validatorAddress VARCHAT(255) NOT NULL,
            transactions TEXT NOT NULL,
            previousHash TEXT NOT NULL,
            hash TEXT NOT NULL,
            nonce INT NOT NULL DEFAULT 0,
            votes TEXT,
            signature TEXT,
            createdAt INT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS block_validatorAddress_previousHash_hash ON ${Blockchain.TABLE_BLOCKS}(validatorAddress, previousHash, hash);
    `;
      //console.log(sql);
      this.db.exec(sql, (err) => {
        if (err)
          reject(err);
        else
          resolve();
      });
    });
  }

  private createBalancesTableIfNotExists(): Promise<void> {
    console.log('create balances database');
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS \`${Blockchain.TABLE_BALANCES}\`(
            address VARCHAT(255) PRIMARY KEY NOT NULL,
            amount INT NOT NULL DEFAULT 0,
            isValidator INT NOT NULL DEFAULT 0,
            updatedAt INT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS balance_address ON ${Blockchain.TABLE_BALANCES}(address);
    `;
      //console.log(sql);
      this.db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private createTransactionsTableIfNotExists(): Promise<void> {
    console.log('create transactions database');
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS ${Blockchain.TABLE_TRANSACTIONS}(
            id VARCHAR(255) PRIMARY KEY NOT NULL,
            fromAddress VARCHAR(255) NOT NULL,
            toAddress VARCHAR(255) NOT NULL DEFAULT 0,
            \`type\` INT NOT NULL DEFAULT 0,
            hash TEXT NOT NULL,
            previousHash TEXT,
            signature TEXT NOT NULL,
            signature2 TEXT,
            updatedAt INT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            createdAt INT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            amount INT,
            securityId VARCHAR(255),
            expiresAt INT,
            startAt INT,
            endAt INT,
            rate INT,
            interest INT,
            acceptedAt INT,
            refusedAt INT,
            description TEXT
        );
        
        CREATE TABLE IF NOT EXISTS ${Blockchain.TABLE_PENDING_TRANSACTIONS}(
            id VARCHAR(255) PRIMARY KEY NOT NULL,
            fromAddress VARCHAR(255) NOT NULL,
            toAddress VARCHAR(255) NOT NULL DEFAULT 0,
            \`type\` INT NOT NULL DEFAULT 0,
            hash TEXT NOT NULL,
            previousHash TEXT,
            signature TEXT NOT NULL,
            signature2 TEXT,
            updatedAt INT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            createdAt INT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            amount INT,
            securityId VARCHAR(255),
            expiresAt INT,
            startAt INT,
            endAt INT,
            rate INT,
            interest INT,
            acceptedAt INT,
            refusedAt INT,
            description TEXT
        );
        CREATE INDEX IF NOT EXISTS pending_transaction_from_address ON ${Blockchain.TABLE_PENDING_TRANSACTIONS}(fromAddress);
        CREATE INDEX IF NOT EXISTS pending_transaction_to_address ON ${Blockchain.TABLE_PENDING_TRANSACTIONS}(toAddress);
        CREATE INDEX IF NOT EXISTS pending_transaction_type ON ${Blockchain.TABLE_PENDING_TRANSACTIONS}(\`type\`);
        CREATE INDEX IF NOT EXISTS pending_transaction_type_from_address ON ${Blockchain.TABLE_PENDING_TRANSACTIONS}(\`type\`, fromAddress);
        CREATE INDEX IF NOT EXISTS pending_transaction_type_to_address ON ${Blockchain.TABLE_PENDING_TRANSACTIONS}(\`type\`, toAddress);
        CREATE INDEX IF NOT EXISTS transaction_from_address ON ${Blockchain.TABLE_TRANSACTIONS}(fromAddress);
        CREATE INDEX IF NOT EXISTS transaction_to_address ON ${Blockchain.TABLE_TRANSACTIONS}(toAddress);
        CREATE INDEX IF NOT EXISTS transaction_type ON ${Blockchain.TABLE_TRANSACTIONS}(\`type\`);
        CREATE INDEX IF NOT EXISTS transaction_type_from_address ON ${Blockchain.TABLE_TRANSACTIONS}(\`type\`, fromAddress);
        CREATE INDEX IF NOT EXISTS transaction_type_to_address ON ${Blockchain.TABLE_TRANSACTIONS}(\`type\`, toAddress);
        
    `;
      //console.log(sql);
      this.db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  getPendingTransactions(offset: number = 0, limit: number = -1): Promise<AvailableBlockTransactionType[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM \`${Blockchain.TABLE_PENDING_TRANSACTIONS}\` ${limit > 0 ? 'LIMIT ' + offset + ',' + limit : ''}`, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map((row) => Block.definePrototypeOfTransaction(row)));
        }
      })
    })
  }


  getTransactions(offset: number = 0, limit: number = 10): Promise<AvailableBlockTransactionType[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM \`${Blockchain.TABLE_TRANSACTIONS}\` WHERE type='transaction' AND fromAddress='${this.getAddress()}' LIMIT ${offset},${limit}`, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map((row) => Block.definePrototypeOfTransaction(row)));
        }
      })
    })
  }

  countTransactions(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT COUNT(*) as ct FROM \`${Blockchain.TABLE_TRANSACTIONS}\` WHERE type='transaction' AND fromAddress='${this.getAddress()}' LIMIT 1`, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.ct);
        }
      })
    })
  }

  countPendingTransactions(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT COUNT(*) as ct FROM \`${Blockchain.TABLE_PENDING_TRANSACTIONS}\` WHERE type='transaction' LIMIT 1`, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.ct);
        }
      })
    })
  }


  async checkPendingTransaction(transaction: AvailableBlockTransactionType) {
    if (transaction.fromAddress === transaction.toAddress)
      return false;

    const balances = await this.getBalanceOfAddress([transaction.fromAddress, transaction.fromAddress]);
    return transaction.check(balances);
  }

  async checkPendingTransactions() {
    const transactions = await this.getPendingTransactions();
    const addresses = transactions.reduce((result, tx) => {
      if (!result.includes(tx.fromAddress))
        result.push(tx.fromAddress);
      else if (!result.includes(tx.toAddress))
        result.push(tx.toAddress);
      return result;
    }, [] as string[]);
    const balances = await this.getBalanceOfAddress(addresses);
    for (const transaction of transactions) {
      transaction.check(balances);
    }
    return true;
  }

  async isPendingTransaction(transaction: AvailableBlockTransactionType): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT COUNT(id) as ct FROM ${Blockchain.TABLE_PENDING_TRANSACTIONS} WHERE id = ?`, [transaction.id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.ct != 0);
        }
      })
    })
  }

  getTransactionById<T = AvailableBlockTransactionType>(transactionId: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.get(`SELECT * FROM (SELECT * FROM ${Blockchain.TABLE_TRANSACTIONS} ORDER BY createdAt DESC) t WHERE t.id = ? LIMIT 1`, [transactionId], (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve(Block.definePrototypeOfTransaction(row));
          } else {
            resolve(undefined);
          }
        })
      })
    })
  }

  addTransactionToDatabase(transaction: AvailableBlockTransactionType): Promise<void> {
    if (!transaction.isValid())
      return Promise.reject();

    console.log('addTransaction : ', transaction.id);

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        const insert = transaction.getInsertSQL(Blockchain.TABLE_PENDING_TRANSACTIONS);
        this.db.run(insert.query, insert.variables, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        })
      });
    });
  }

  getGenesisBlock(): Promise<Block | void> {
    console.log('Check Genesis Block exists');
    return new Promise((resolve, reject) => {
      const genesisBlockSql = `SELECT * FROM \`${Blockchain.TABLE_BLOCKS}\` WHERE id=0`
      this.db.get(genesisBlockSql, (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row?.id === 0)
            resolve(Block.fromData(row));
          else
            resolve();
        }
      });
    })
  }

  hasGenesisBlock(): Promise<boolean> {
    console.log('Check Genesis Block exists');
    return this.getGenesisBlock().then((block) => !!block);
  }

  async getBalance() {
    const balances = await this.getBalanceOfAddress([this.getAddress()]);
    return balances[this.getAddress()];
  }

  getBalanceOfAddress(addresses: string | string[], defaultAmount: number = 0): Promise<Balances> {
    if (!Array.isArray(addresses))
      addresses = [addresses];

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {

        const sql = `SELECT address, amount FROM \`${Blockchain.TABLE_BALANCES}\` WHERE address IN (${((addresses as string[]).map((item) => '?'))});`
        this.db.all(sql, addresses, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const initialResult = (addresses as string[]).reduce((result, address) => ({
              ...result,
              [address]: defaultAmount
            }), {} as Balances);
            const balances = rows.reduce((result, item) => ({...result, [item.address]: item.amount}), initialResult);
            resolve(balances);
          }
        })
      })
    });
  }

  generateBalanceDatabase(): Promise<void> {
    return this.checkDatabaseBlocks()
      .then((balances) => {
        if (!balances)
          return Promise.reject();

        return new Promise((resolve, reject) => {
          const sql = Object
            .keys(balances)
            .filter((address) => balances[address] < 0)
            .map(async (address) => {
              const amount = balances[address];
              const sql = `INSERT INTO \`${Blockchain.TABLE_BALANCES}\` (address, amount) VALUES (${address}, ${amount})`;

              balances[address] = 0;

              return sql;
            })
            .join(';');

          this.db.run(`TRUNCATE TABLE \`${Blockchain.TABLE_BALANCES}\`;\n${sql}`, (err) => {
            if (err) {
              reject();
            } else {
              resolve();
            }
          });

        });
      })
  }

  checkBlock(block: Block, balances: Balances, previousBlock?: Block) {
    if ((block.id > 0 && previousBlock!.hash !== block.previousHash) || !block.isValid()) {
      console.log('something bad happend');
      return false;
    }

    if (!(block.validatorAddress in balances))
      balances[block.validatorAddress] = 0;

    block.transactions.forEach((transaction) => {
      if (!(transaction.fromAddress in balances))
        balances[transaction.fromAddress] = 0;

      if (!(transaction.fromAddress in balances))
        balances[transaction.toAddress] = 0;
    });

    block.getVotes().forEach((vote) => {
      if (!(vote.voterAddress in balances))
        balances[vote.voterAddress] = 0;
    });

    if (block.id > 0) {
      if (balances[block.validatorAddress] === 0) {
        console.warn('Validator balance could not be 0');
        return false;
      }

      block.getVotes().forEach((vote) => {
        if (balances[vote.voterAddress] === 0) {
          console.warn('Voter balance could not be 0');
          return false;
        }
      });
    }


    for (const transaction of block.transactions) {
      if (!transaction.check(balances, block.id === 0)) {
        console.log('Something bad with the transaction : ', transaction.id);
        return false;
      }
    }

    if (block.id === 0)
      return true;

    block.getVotes().forEach((vote) => {
      if (balances[vote.voterAddress] === 0) {
        console.warn('Voter balance could not be 0');
        return false;
      }
      balances[vote.voterAddress] = balances[vote.voterAddress] * Blockchain.REWARD;
    });

    if (block.signature) {
      const result = block.getVoteResult(balances);

      if (!result?.length) {
        console.warn('The vote result is corrupted');
        return false;
      }

      const winners = result[0];
      let isValidatorValid = true;
      block.getVotes().forEach((vote) => {
        if (vote.asValidator && vote.value !== winners.hash) {
          balances[vote.voterAddress] = 0;
          if (vote.voterAddress === block.validatorAddress) {
            isValidatorValid = false;
          }
        }
      });
      return isValidatorValid;
    }
    return true;
  }

  checkDatabaseBlocks(): Promise<Balances | undefined> {
    console.log('Check database blocks');
    return new Promise((resolve, reject) => {
      let previousBlock: Block;
      let balances: { [address: string]: number } = {};
      this.db.each(`SELECT * FROM \`${Blockchain.TABLE_BLOCKS}\``, async (err, row) => {
        if (err) {
          reject();
        } else if (row) {
          const block = Block.fromData(row);
          if (!this.checkBlock(block, balances, previousBlock)) {
            this.db.interrupt();
            return;
          }
          previousBlock = block;
        } else {
          reject();
        }
      }, (err, count) => {
        if (err) {
          reject();
        } else {
          resolve(balances);
        }
      });
    });
  }


  createGenesisBlock(): Promise<Block | undefined> {
    return this
      .getGenesisBlock()
      .then((currentGenesisBlock) => {
        return new Promise((resolve, reject) => {
          if (!currentGenesisBlock) {
            console.log('Create Genesis block');
            console.log('Create Genesis block .... OK');

            const currentGenesisBlock = Block.fromData(genesisBlock);
            const masterKey = BlockData.ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e910');

            currentGenesisBlock.transactions.forEach((transaction) => {
              transaction.hash = transaction.calculateHash();
              transaction.signature = undefined;
              transaction.signature2 = undefined;
              transaction.sign(masterKey);
            });
            currentGenesisBlock.validatorAddress = masterKey.getPublic('hex');
            currentGenesisBlock.hash = currentGenesisBlock.calculateHash();
            currentGenesisBlock.signature = undefined;
            currentGenesisBlock.sign(masterKey);
            console.log('currentGenesisBlock : ', JSON.stringify(currentGenesisBlock, null, 4));


            this.syncBlock(currentGenesisBlock).then(resolve).catch(reject);
          } else {
            console.log('Genesis block already exists');
            resolve(currentGenesisBlock);
          }
        });
      })
  }

  dropTables() {
    return Promise.all([this.dropBlocksTable(), this.dropBalancesTable()]);
  }

  dropBlocksTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`DROP TABLE \`${Blockchain.TABLE_BLOCKS}\`;`, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
    });
  }

  dropBalancesTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`DROP TABLE \`${Blockchain.TABLE_BALANCES}\`;`, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
    });
  }

  public getLatestBlock(): Promise<Block | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM \`${Blockchain.TABLE_BLOCKS}\` ORDER BY id DESC, createdAt DESC LIMIT 1`, (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row)
            resolve(Block.fromData(row));
          else
            resolve(undefined);
        }
      })
    })
  }

  async generateBlock(validatorAddress: string): Promise<Block | undefined> {
    const latestBlock = await this.getLatestBlock();
    const pendingTransactions = await this.getPendingTransactions();

    const block = new Block((latestBlock?.id ?? 0) + 1, Math.round(Date.now() / 1000), validatorAddress, pendingTransactions, latestBlock!.hash);
    if (!block.hasValidTransactions()) {
      throw new Error('No valid transactions');
    }
    return block;
  }

  async voteAsValidator(block: Block, signingKey?: EC.KeyPair) {
    const validatorAddress = (signingKey && signingKey?.getPublic('hex')) || this.getAddress();
    console.log('block.validatorAddress : ', block.validatorAddress, validatorAddress);
    if (block.validatorAddress != validatorAddress)
      throw new Error('You cannot vote as a validator because you are not a validator');

    const previousBlock = await this.getLatestBlock();
    const balances = await this.getBalanceOfAddress(block.getAddresses());

    if (!this.checkBlock(block, balances, previousBlock))
      throw new Error('The block is invalid');

    console.log('Validator ready to vote');
    this.vote(block, signingKey);

    return block;
  }

  vote(block: Block, signingKey?: EC.KeyPair) {
    console.log('Blockchain.vote');
    return block.addVote(block.vote(signingKey ?? this.signingKey));
  }

  async cleanPendingTransactions(): Promise<void> {
    console.log('cleanPendingTransactions');
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.exec(`DROP TABLE ${Blockchain.TABLE_PENDING_TRANSACTIONS};VACUUM;`, async (err) => {
          if (err) {
            reject(err);
          } else {
            try {
              await this.createTransactionsTableIfNotExists();
            } catch (e) {
              reject(e);
            }
            resolve();
          }
        })
      })
    });
  }

  async syncBlock(newBlock: Block): Promise<Block> {
    console.log('syncBlock : ', newBlock.id);
    const latestBlock = await this.getLatestBlock();
    const balances = await this.getBalanceOfAddress(newBlock.getAddresses());
    if (!this.checkBlock(newBlock, balances, latestBlock))
      return Promise.reject('bad block');

    console.log('syncBlock : ', newBlock.id, ' ... processing');
    return new Promise((resolve, reject) => {
      this.db.serialize(async () => {
        try {
          const inserts = [newBlock.getInsertSQL(Blockchain.TABLE_BLOCKS), ...newBlock.transactions.map((transaction) => transaction.getInsertSQL(Blockchain.TABLE_TRANSACTIONS))];
          await Promise
            .all(inserts.map((insert) => new Promise((resolve, reject) => {
              this.db.run(insert.query, insert.variables, (err) => {
                if (err) {
                  console.log('insert.query : ', insert.query, insert.variables)
                  reject(err);
                } else {
                  resolve(newBlock);
                }
              })
            })))

          const balances = await this.getBalanceOfAddress(newBlock.getAddresses());
          const addresses = Object.keys(balances);

          newBlock.transactions.forEach((transaction) => {
            transaction.check(balances, newBlock.id === 0);
          })

          await Promise
            .all(addresses.map((address) => new Promise((resolve, reject) => this.db.run(`INSERT OR REPLACE INTO ${Blockchain.TABLE_BALANCES} (address, amount) VALUES (?,?)`, [address, balances[address] ?? 0], (err) => {
                if (err) {
                  console.log('err : ', err);
                  reject(err);
                } else {
                  resolve(newBlock);
                }
              })
            )))


          resolve(newBlock)
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async addBlock(newBlock: Block, signingKey?: EC.KeyPair): Promise<any> {
    if (!signingKey && this.getAddress() !== newBlock.validatorAddress) {
      console.warn('you cannot add a block if you are not the validator');
      return false;
    }

    const latestBlock = await this.getLatestBlock();
    newBlock.previousHash = latestBlock!.hash;
    newBlock.sign(signingKey ?? this.signingKey);

    return await this.syncBlock(newBlock).then(async () => await this.cleanPendingTransactions());
  }

  async isChainValid() {
    const balances = await this.checkDatabaseBlocks();
    return (balances && this.getAddress() in balances);
  }

  async addTransaction(transaction: Transaction) {
    if (!`${transaction.fromAddress ?? ''}`.trim().length || !`${transaction.toAddress ?? ''}`.trim().length) {
      throw new Error('fromAddress or toAdress could not be empty');
    }

    if (!transaction.isValid()) {
      throw new Error('You cannot add not valid transaction');
    }

    const isAlreadyAdded = await this.isPendingTransaction(transaction);
    if (isAlreadyAdded) {
      throw new Error('Transaction already added for the next block');
    }


    return await this.addTransactionToDatabase(transaction);
  }

  async addSecurity(security: Security) {
    if (!security.id) {
      throw new Error('You cannot add security without id');
    }

    if (!security.isValid()) {
      throw new Error('You cannot add not valid security');
    }

    const isAlreadyAdded = await this.isPendingTransaction(security);
    if (isAlreadyAdded) {
      throw new Error('Transaction already added for the next block');
    }

    const existingSecurity = await this.getTransactionById<Security>(security.id!);
    if (existingSecurity && existingSecurity?.fromAddress !== security.fromAddress)
      throw new Error('You cannot modify a security signed by someone else');

    security.previousHash = existingSecurity?.hash;
    security.sign(this.signingKey);

    return await this.addTransactionToDatabase(security);
  }

  async addLoan(loan: Loan) {

    if (!loan.id) {
      throw new Error('You cannot add a loan without id');
    }

    if (!loan.isValid()) {
      throw new Error('You cannot add not valid security');
    }

    const existingLoan = await this.getTransactionById<Loan>(loan.id!);
    if (existingLoan && existingLoan?.fromAddress !== loan.fromAddress)
      throw new Error('You cannot modify a security signed by someone else');

    if (existingLoan?.signature && existingLoan?.signature2) {
      throw new Error('you cannot modify a both signed loan');
    }

    loan.previousHash = existingLoan?.hash;
    loan.sign(this.signingKey);

    if (!loan.isValid()) {
      throw new Error('you cannot add not valid loan');
    }

    return await this.addTransactionToDatabase(loan);
  }

  async addUser(user: User) {

    if (!user.id) {
      throw new Error('You cannot add a user without id');
    }

    if (!user.isValid()) {
      throw new Error('You cannot add not valid security');
    }

    const existingUser = await this.getTransactionById<User>(user.id!);
    if (existingUser && existingUser?.fromAddress !== user.fromAddress)
      throw new Error('You cannot modify a security signed by someone else');

    if (existingUser?.signature && existingUser?.signature2) {
      throw new Error('you cannot modify a both signed loan');
    }

    user.previousHash = existingUser?.hash;
    user.sign(this.signingKey);

    if (!user.isValid()) {
      throw new Error('you cannot add not valid loan');
    }

    return await this.addTransactionToDatabase(user);
  }

  public getAddress() {
    return this.signingKey.getPublic('hex');
  }


}
