var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Block } from "./Block";
import { BlockData } from "./BlockData";
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import genesisBlock from "../genesisBlock";
import { EventEmitter } from 'events';
export class Blockchain extends EventEmitter {
    constructor(signingKey) {
        super();
        this.chain = [];
        this.miningReward = 100;
        this.pendingTransactions = [];
        this.signingKey = signingKey;
        const dbPath = path.join(__dirname, '../db');
        try {
            fs.mkdirSync(dbPath);
        }
        catch (e) {
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
        });
    }
    stop() {
        this.db.close((err) => {
            if (err) {
                console.error(err.message);
            }
            console.log('Close the database connection.');
        });
    }
    init() {
        this.db.serialize(() => __awaiter(this, void 0, void 0, function* () {
            yield this.createBlocksTableIfNotExists();
            yield this.createBalancesTableIfNotExists();
            yield this.createTransactionsTableIfNotExists();
            yield this.createGenesisBlock();
            yield this.checkDatabaseBlocks();
            this.emit('ready', this.getBalance());
        }));
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    createBlocksTableIfNotExists() {
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
    createBalancesTableIfNotExists() {
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
                }
                else {
                    resolve();
                }
            });
        });
    }
    createTransactionsTableIfNotExists() {
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
                }
                else {
                    resolve();
                }
            });
        });
    }
    getPendingTransactions(offset = 0, limit = -1) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM \`${Blockchain.TABLE_PENDING_TRANSACTIONS}\` ${limit > 0 ? 'LIMIT ' + offset + ',' + limit : ''}`, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map((row) => Block.definePrototypeOfTransaction(row)));
                }
            });
        });
    }
    getTransactions(offset = 0, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM \`${Blockchain.TABLE_TRANSACTIONS}\` WHERE type='transaction' AND fromAddress='${this.getAddress()}' LIMIT ${offset},${limit}`, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map((row) => Block.definePrototypeOfTransaction(row)));
                }
            });
        });
    }
    countTransactions() {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT COUNT(*) as ct FROM \`${Blockchain.TABLE_TRANSACTIONS}\` WHERE type='transaction' AND fromAddress='${this.getAddress()}' LIMIT 1`, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row.ct);
                }
            });
        });
    }
    countPendingTransactions() {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT COUNT(*) as ct FROM \`${Blockchain.TABLE_PENDING_TRANSACTIONS}\` WHERE type='transaction' LIMIT 1`, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row.ct);
                }
            });
        });
    }
    checkPendingTransaction(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            if (transaction.fromAddress === transaction.toAddress)
                return false;
            const balances = yield this.getBalanceOfAddress([transaction.fromAddress, transaction.fromAddress]);
            return transaction.check(balances);
        });
    }
    checkPendingTransactions() {
        return __awaiter(this, void 0, void 0, function* () {
            const transactions = yield this.getPendingTransactions();
            const addresses = transactions.reduce((result, tx) => {
                if (!result.includes(tx.fromAddress))
                    result.push(tx.fromAddress);
                else if (!result.includes(tx.toAddress))
                    result.push(tx.toAddress);
                return result;
            }, []);
            const balances = yield this.getBalanceOfAddress(addresses);
            for (const transaction of transactions) {
                transaction.check(balances);
            }
            return true;
        });
    }
    isPendingTransaction(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.db.get(`SELECT COUNT(id) as ct FROM ${Blockchain.TABLE_PENDING_TRANSACTIONS} WHERE id = ?`, [transaction.id], (err, row) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(row.ct != 0);
                    }
                });
            });
        });
    }
    getTransactionById(transactionId) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.get(`SELECT * FROM (SELECT * FROM ${Blockchain.TABLE_TRANSACTIONS} ORDER BY createdAt DESC) t WHERE t.id = ? LIMIT 1`, [transactionId], (err, row) => {
                    if (err) {
                        reject(err);
                    }
                    else if (row) {
                        resolve(Block.definePrototypeOfTransaction(row));
                    }
                    else {
                        resolve(undefined);
                    }
                });
            });
        });
    }
    addTransactionToDatabase(transaction) {
        if (!transaction.isValid())
            return Promise.reject();
        console.log('addTransaction : ', transaction.id);
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                const insert = transaction.getInsertSQL(Blockchain.TABLE_PENDING_TRANSACTIONS);
                this.db.run(insert.query, insert.variables, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    getGenesisBlock() {
        console.log('Check Genesis Block exists');
        return new Promise((resolve, reject) => {
            const genesisBlockSql = `SELECT * FROM \`${Blockchain.TABLE_BLOCKS}\` WHERE id=0`;
            this.db.get(genesisBlockSql, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    if ((row === null || row === void 0 ? void 0 : row.id) === 0)
                        resolve(Block.fromData(row));
                    else
                        resolve();
                }
            });
        });
    }
    hasGenesisBlock() {
        console.log('Check Genesis Block exists');
        return this.getGenesisBlock().then((block) => !!block);
    }
    getBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            const balances = yield this.getBalanceOfAddress([this.getAddress()]);
            return balances[this.getAddress()];
        });
    }
    getBalanceOfAddress(addresses, defaultAmount = 0) {
        if (!Array.isArray(addresses))
            addresses = [addresses];
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                const sql = `SELECT address, amount FROM \`${Blockchain.TABLE_BALANCES}\` WHERE address IN (${(addresses.map((item) => '?'))});`;
                this.db.all(sql, addresses, (err, rows) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        const initialResult = addresses.reduce((result, address) => (Object.assign(Object.assign({}, result), { [address]: defaultAmount })), {});
                        const balances = rows.reduce((result, item) => (Object.assign(Object.assign({}, result), { [item.address]: item.amount })), initialResult);
                        resolve(balances);
                    }
                });
            });
        });
    }
    generateBalanceDatabase() {
        return this.checkDatabaseBlocks()
            .then((balances) => {
            if (!balances)
                return Promise.reject();
            return new Promise((resolve, reject) => {
                const sql = Object
                    .keys(balances)
                    .filter((address) => balances[address] < 0)
                    .map((address) => __awaiter(this, void 0, void 0, function* () {
                    const amount = balances[address];
                    const sql = `INSERT INTO \`${Blockchain.TABLE_BALANCES}\` (address, amount) VALUES (${address}, ${amount})`;
                    balances[address] = 0;
                    return sql;
                }))
                    .join(';');
                this.db.run(`TRUNCATE TABLE \`${Blockchain.TABLE_BALANCES}\`;\n${sql}`, (err) => {
                    if (err) {
                        reject();
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    checkBlock(block, balances, previousBlock) {
        if ((block.id > 0 && previousBlock.hash !== block.previousHash) || !block.isValid()) {
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
            if (!(result === null || result === void 0 ? void 0 : result.length)) {
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
    checkDatabaseBlocks() {
        console.log('Check database blocks');
        return new Promise((resolve, reject) => {
            let previousBlock;
            let balances = {};
            this.db.each(`SELECT * FROM \`${Blockchain.TABLE_BLOCKS}\``, (err, row) => __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    reject();
                }
                else if (row) {
                    const block = Block.fromData(row);
                    if (!this.checkBlock(block, balances, previousBlock)) {
                        this.db.interrupt();
                        return;
                    }
                    previousBlock = block;
                }
                else {
                    reject();
                }
            }), (err, count) => {
                if (err) {
                    reject();
                }
                else {
                    resolve(balances);
                }
            });
        });
    }
    createGenesisBlock() {
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
                }
                else {
                    console.log('Genesis block already exists');
                    resolve(currentGenesisBlock);
                }
            });
        });
    }
    dropTables() {
        return Promise.all([this.dropBlocksTable(), this.dropBalancesTable()]);
    }
    dropBlocksTable() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(`DROP TABLE \`${Blockchain.TABLE_BLOCKS}\`;`, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    dropBalancesTable() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(`DROP TABLE \`${Blockchain.TABLE_BALANCES}\`;`, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    getLatestBlock() {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM \`${Blockchain.TABLE_BLOCKS}\` ORDER BY id DESC, createdAt DESC LIMIT 1`, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    if (row)
                        resolve(Block.fromData(row));
                    else
                        resolve(undefined);
                }
            });
        });
    }
    generateBlock(validatorAddress) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const latestBlock = yield this.getLatestBlock();
            const pendingTransactions = yield this.getPendingTransactions();
            const block = new Block(((_a = latestBlock === null || latestBlock === void 0 ? void 0 : latestBlock.id) !== null && _a !== void 0 ? _a : 0) + 1, Math.round(Date.now() / 1000), validatorAddress, pendingTransactions, latestBlock.hash);
            if (!block.hasValidTransactions()) {
                throw new Error('No valid transactions');
            }
            return block;
        });
    }
    voteAsValidator(block, signingKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const validatorAddress = (signingKey && (signingKey === null || signingKey === void 0 ? void 0 : signingKey.getPublic('hex'))) || this.getAddress();
            console.log('block.validatorAddress : ', block.validatorAddress, validatorAddress);
            if (block.validatorAddress != validatorAddress)
                throw new Error('You cannot vote as a validator because you are not a validator');
            const previousBlock = yield this.getLatestBlock();
            const balances = yield this.getBalanceOfAddress(block.getAddresses());
            if (!this.checkBlock(block, balances, previousBlock))
                throw new Error('The block is invalid');
            console.log('Validator ready to vote');
            this.vote(block, signingKey);
            return block;
        });
    }
    vote(block, signingKey) {
        console.log('Blockchain.vote');
        return block.addVote(block.vote(signingKey !== null && signingKey !== void 0 ? signingKey : this.signingKey));
    }
    cleanPendingTransactions() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('cleanPendingTransactions');
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.exec(`DROP TABLE ${Blockchain.TABLE_PENDING_TRANSACTIONS};VACUUM;`, (err) => __awaiter(this, void 0, void 0, function* () {
                        if (err) {
                            reject(err);
                        }
                        else {
                            try {
                                yield this.createTransactionsTableIfNotExists();
                            }
                            catch (e) {
                                reject(e);
                            }
                            resolve();
                        }
                    }));
                });
            });
        });
    }
    syncBlock(newBlock) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('syncBlock : ', newBlock.id);
            const latestBlock = yield this.getLatestBlock();
            const balances = yield this.getBalanceOfAddress(newBlock.getAddresses());
            if (!this.checkBlock(newBlock, balances, latestBlock))
                return Promise.reject('bad block');
            console.log('syncBlock : ', newBlock.id, ' ... processing');
            return new Promise((resolve, reject) => {
                this.db.serialize(() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const inserts = [newBlock.getInsertSQL(Blockchain.TABLE_BLOCKS), ...newBlock.transactions.map((transaction) => transaction.getInsertSQL(Blockchain.TABLE_TRANSACTIONS))];
                        yield Promise
                            .all(inserts.map((insert) => new Promise((resolve, reject) => {
                            this.db.run(insert.query, insert.variables, (err) => {
                                if (err) {
                                    console.log('insert.query : ', insert.query, insert.variables);
                                    reject(err);
                                }
                                else {
                                    resolve(newBlock);
                                }
                            });
                        })));
                        const balances = yield this.getBalanceOfAddress(newBlock.getAddresses());
                        const addresses = Object.keys(balances);
                        newBlock.transactions.forEach((transaction) => {
                            transaction.check(balances, newBlock.id === 0);
                        });
                        yield Promise
                            .all(addresses.map((address) => new Promise((resolve, reject) => {
                            var _a;
                            return this.db.run(`INSERT OR REPLACE INTO ${Blockchain.TABLE_BALANCES} (address, amount) VALUES (?,?)`, [address, (_a = balances[address]) !== null && _a !== void 0 ? _a : 0], (err) => {
                                if (err) {
                                    console.log('err : ', err);
                                    reject(err);
                                }
                                else {
                                    resolve(newBlock);
                                }
                            });
                        })));
                        resolve(newBlock);
                    }
                    catch (e) {
                        reject(e);
                    }
                }));
            });
        });
    }
    addBlock(newBlock, signingKey) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!signingKey && this.getAddress() !== newBlock.validatorAddress) {
                console.warn('you cannot add a block if you are not the validator');
                return false;
            }
            const latestBlock = yield this.getLatestBlock();
            newBlock.previousHash = latestBlock.hash;
            newBlock.sign(signingKey !== null && signingKey !== void 0 ? signingKey : this.signingKey);
            return yield this.syncBlock(newBlock).then(() => __awaiter(this, void 0, void 0, function* () { return yield this.cleanPendingTransactions(); }));
        });
    }
    isChainValid() {
        return __awaiter(this, void 0, void 0, function* () {
            const balances = yield this.checkDatabaseBlocks();
            return (balances && this.getAddress() in balances);
        });
    }
    addTransaction(transaction) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (!`${(_a = transaction.fromAddress) !== null && _a !== void 0 ? _a : ''}`.trim().length || !`${(_b = transaction.toAddress) !== null && _b !== void 0 ? _b : ''}`.trim().length) {
                throw new Error('fromAddress or toAdress could not be empty');
            }
            if (!transaction.isValid()) {
                throw new Error('You cannot add not valid transaction');
            }
            const isAlreadyAdded = yield this.isPendingTransaction(transaction);
            if (isAlreadyAdded) {
                throw new Error('Transaction already added for the next block');
            }
            return yield this.addTransactionToDatabase(transaction);
        });
    }
    addSecurity(security) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!security.id) {
                throw new Error('You cannot add security without id');
            }
            if (!security.isValid()) {
                throw new Error('You cannot add not valid security');
            }
            const isAlreadyAdded = yield this.isPendingTransaction(security);
            if (isAlreadyAdded) {
                throw new Error('Transaction already added for the next block');
            }
            const existingSecurity = yield this.getTransactionById(security.id);
            if (existingSecurity && (existingSecurity === null || existingSecurity === void 0 ? void 0 : existingSecurity.fromAddress) !== security.fromAddress)
                throw new Error('You cannot modify a security signed by someone else');
            security.previousHash = existingSecurity === null || existingSecurity === void 0 ? void 0 : existingSecurity.hash;
            security.sign(this.signingKey);
            return yield this.addTransactionToDatabase(security);
        });
    }
    addLoan(loan) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!loan.id) {
                throw new Error('You cannot add a loan without id');
            }
            if (!loan.isValid()) {
                throw new Error('You cannot add not valid security');
            }
            const existingLoan = yield this.getTransactionById(loan.id);
            if (existingLoan && (existingLoan === null || existingLoan === void 0 ? void 0 : existingLoan.fromAddress) !== loan.fromAddress)
                throw new Error('You cannot modify a security signed by someone else');
            if ((existingLoan === null || existingLoan === void 0 ? void 0 : existingLoan.signature) && (existingLoan === null || existingLoan === void 0 ? void 0 : existingLoan.signature2)) {
                throw new Error('you cannot modify a both signed loan');
            }
            loan.previousHash = existingLoan === null || existingLoan === void 0 ? void 0 : existingLoan.hash;
            loan.sign(this.signingKey);
            if (!loan.isValid()) {
                throw new Error('you cannot add not valid loan');
            }
            return yield this.addTransactionToDatabase(loan);
        });
    }
    addUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!user.id) {
                throw new Error('You cannot add a user without id');
            }
            if (!user.isValid()) {
                throw new Error('You cannot add not valid security');
            }
            const existingUser = yield this.getTransactionById(user.id);
            if (existingUser && (existingUser === null || existingUser === void 0 ? void 0 : existingUser.fromAddress) !== user.fromAddress)
                throw new Error('You cannot modify a security signed by someone else');
            if ((existingUser === null || existingUser === void 0 ? void 0 : existingUser.signature) && (existingUser === null || existingUser === void 0 ? void 0 : existingUser.signature2)) {
                throw new Error('you cannot modify a both signed loan');
            }
            user.previousHash = existingUser === null || existingUser === void 0 ? void 0 : existingUser.hash;
            user.sign(this.signingKey);
            if (!user.isValid()) {
                throw new Error('you cannot add not valid loan');
            }
            return yield this.addTransactionToDatabase(user);
        });
    }
    getAddress() {
        return this.signingKey.getPublic('hex');
    }
}
Blockchain.TABLE_BLOCKS = 'blocks';
Blockchain.TABLE_BALANCES = 'balances';
Blockchain.TABLE_PENDING_TRANSACTIONS = 'pending_transactions';
Blockchain.TABLE_TRANSACTIONS = 'transactions';
Blockchain.ROOT_ADDRESS = '04a78f9df9d68223fc980f14b111bd7d57c279de0a257c43fa389989fd958790836c5fe4222ec084481e362c00befa3a28cf7f1df76819d311d07b129ad8c7c2f5';
Blockchain.STATIC_FEE = 0.0002;
Blockchain.REWARD = 0.01;
Blockchain.escrow = {
    publicKey: '04a78f9df9d68223fc980f14b111bd7d57c279de0a257c43fa389989fd958790836c5fe4222ec084481e362c00befa3a28cf7f1df76819d311d07b129ad8c7c2f5',
    privateKey: '049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b6'
};
