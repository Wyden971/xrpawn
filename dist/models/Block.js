"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sha256_1 = __importDefault(require("crypto-js/sha256"));
const Transaction_1 = require("./Transaction");
const Security_1 = require("./Security");
const User_1 = require("./User");
const Loan_1 = require("./Loan");
const BlockData_1 = require("./BlockData");
class Block {
    constructor(index, timestamp, validatorAddress, transactions, previousHash = '') {
        this.votes = [];
        this.index = index;
        this.timestamp = timestamp;
        this.validatorAddress = validatorAddress;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }
    static definePrototypeOfTransaction(object) {
        let prototype;
        switch (object.type) {
            case BlockData_1.BlockDataType.security:
                prototype = Security_1.Security.prototype;
                break;
            case BlockData_1.BlockDataType.transaction:
                prototype = Transaction_1.Transaction.prototype;
                break;
            case BlockData_1.BlockDataType.loan:
                prototype = Loan_1.Loan.prototype;
                break;
            case BlockData_1.BlockDataType.user:
                prototype = User_1.User.prototype;
                break;
        }
        if (prototype)
            return Object.setPrototypeOf(object, prototype);
    }
    static fromData(data) {
        const block = Object.setPrototypeOf(data, Block.prototype);
        block.transactions.map((tx) => Block.definePrototypeOfTransaction(tx));
        return block;
    }
    generateHash(includeVotes = false) {
        this.hash = this.calculateHash(includeVotes);
        return this;
    }
    getVotes() {
        var _a;
        return [...(_a = this.votes) !== null && _a !== void 0 ? _a : []];
    }
    hasValidVotes(blockchain) {
        const votes = this.votes.filter((vote) => this.isValidVote(vote, blockchain));
        if (votes.length < 3) {
            console.warn('3 votes are required');
            return false;
        }
        return true;
    }
    getVoteHash(voterAddress, value, asValidator) {
        return sha256_1.default(`${voterAddress}${asValidator}${value}`).toString();
    }
    addVote(vote, blockchain) {
        if (this.isValidVote(vote, blockchain)) {
            const existingVote = this.votes.find((item) => item.voterAddress === vote.voterAddress);
            if (existingVote) {
                throw new Error('You cannot vote twice');
            }
            this.votes.push(vote);
        }
        else {
            throw new Error('you cannot add a not valid vote');
        }
    }
    isValidVote(vote, blockchain) {
        var _a;
        const keyGen = BlockData_1.BlockData.ec.keyFromPublic(vote.voterAddress, 'hex');
        if (this.calculateHash() !== vote.value) {
            console.error('Invalid hash');
            return false;
        }
        const validVoteResult = keyGen.verify(this.getVoteHash(vote.voterAddress, vote.value, vote.asValidator), vote.signature);
        if (!validVoteResult) {
            console.error('Invalid vote result');
            return false;
        }
        const amount = (_a = (blockchain && blockchain.getBalanceOfAddress(vote.voterAddress))) !== null && _a !== void 0 ? _a : 1;
        if (amount <= 0) {
            console.error('You havent got money');
        }
        return (amount > 0);
    }
    getVoteResult(blockchain) {
        const votes = this.votes
            .map((vote) => (Object.assign(Object.assign({}, vote), { balance: blockchain.getBalanceOfAddress(vote.voterAddress) })))
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
            var _a;
            return Object.assign(Object.assign({}, result), { [item.value]: [...((_a = result[item.value]) !== null && _a !== void 0 ? _a : []), ((item.balance / total) * limit)] });
        }, {});
        const orderedVotes = Object.keys(hashes).map((item) => {
            const hashItem = hashes[item];
            return ({
                hash: item,
                value: hashItem.length * hashItem.reduce((result, nextItem) => result + nextItem, 0)
            });
        })
            .sort((itemsA, itemsB) => {
            if (itemsA.value < itemsB.value) {
                return 1;
            }
            else if (itemsA.value > itemsB.value) {
                return -1;
            }
            else {
                return 0;
            }
        });
        return orderedVotes;
    }
    vote(signingKey) {
        const voterAddress = signingKey.getPublic('hex');
        const asValidator = (voterAddress === this.validatorAddress);
        const value = this.calculateHash();
        const hash = this.getVoteHash(voterAddress, value, asValidator);
        const signature = signingKey.sign(hash, 'base64').toDER('hex');
        const existingVote = this.votes.find((item) => item.voterAddress === voterAddress);
        if (existingVote) {
            throw new Error('You cannot vote twice');
        }
        return {
            voterAddress,
            signature,
            value,
            asValidator
        };
    }
    calculateHash(includeVotes = false) {
        const transactions = this.transactions.map((transaction) => Block.definePrototypeOfTransaction(transaction));
        return sha256_1.default(`${this.index}${this.previousHash}${this.timestamp}${this.validatorAddress}${includeVotes ? JSON.stringify(this.votes) : ''}${JSON.stringify(transactions)}${includeVotes ? this.nonce : ''}`).toString();
    }
    mineBlock(difficulty, includeVotes = false) {
        const tm = Date.now();
        console.log('Mine block... ', this.index, includeVotes, this.calculateHash(includeVotes));
        while (!this.isCorrectHash(difficulty)) {
            this.nonce++;
            this.hash = this.calculateHash(includeVotes);
        }
        console.log('Mined block : ', this.index, this.hash, includeVotes, `${(Date.now() - tm)} ms`);
    }
    isCorrectHash(difficulty) {
        return this.hash.substr(0, difficulty) === (new Array(difficulty + 1)).join('0');
    }
    isValidHash(includeVotes = false) {
        return this.hash === this.calculateHash(includeVotes);
    }
    hasValidSignature() {
        var _a;
        const publicKey = BlockData_1.BlockData.ec.keyFromPublic(this.validatorAddress, 'hex');
        if (!((_a = this.signature) === null || _a === void 0 ? void 0 : _a.length)) {
            console.warn('no signature');
            return false;
        }
        const result = publicKey.verify(this.calculateHash(true), this.signature);
        if (!result) {
            console.warn('Bad signature');
        }
        return result;
    }
    isValid(difficulty) {
        var _a, _b, _c;
        const result = (this.isCorrectHash(difficulty) && this.isValidHash(!!((_a = this.signature) === null || _a === void 0 ? void 0 : _a.length)));
        if (!((_b = this.signature) === null || _b === void 0 ? void 0 : _b.length)) {
            if (!result)
                console.warn('not signed');
            return result;
        }
        if (!result) {
            console.log('incorrect hash');
            return false;
        }
        if (((_c = this.signature) === null || _c === void 0 ? void 0 : _c.length) && !this.votes.length) {
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
    sign(signingKey) {
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
    compare(block) {
        if (block.hash !== this.hash || block.previousHash !== this.previousHash || block.validatorAddress !== this.validatorAddress || block.timestamp !== this.timestamp || block.nonce !== this.nonce || block.signature !== this.signature)
            return false;
        const badVotes = this.votes.some((vote) => {
            return !block.votes.find((item) => item.voterAddress === vote.voterAddress && item.asValidator === vote.asValidator && item.signature === vote.signature && item.value === vote.value);
        });
        if (badVotes)
            return false;
        const transactionsMatches = this.transactions.some((tx) => {
            return block.transactions.some((transaction) => {
                if (tx.id !== transaction.id &&
                    tx.signature !== transaction.signature &&
                    tx.signature2 !== transaction.signature2 &&
                    tx.toAddress !== transaction.toAddress &&
                    tx.fromAddress !== transaction.fromAddress &&
                    tx.previousHash !== transaction.previousHash &&
                    tx.createdAt !== transaction.createdAt &&
                    tx.updatedAt !== transaction.updatedAt &&
                    tx.deletedAt !== transaction.deletedAt &&
                    tx.hash !== transaction.hash &&
                    tx.type !== transaction.type) {
                    return true;
                }
                return false;
            });
        });
        if (transactionsMatches)
            return false;
        return true;
    }
}
exports.Block = Block;
//# sourceMappingURL=Block.js.map