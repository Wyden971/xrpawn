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
const Blockchain_1 = require("./Blockchain");
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
    decryptVote(address) {
    }
    generateHash(includeVotes = false) {
        this.hash = this.calculateHash(includeVotes);
        return this;
    }
    sign(signingKey) {
        if (signingKey.getPublic('hex') !== this.validatorAddress) {
            throw new Error('You cannot sign transaction for other validator');
        }
        if (!this.isValidHash()) {
            throw new Error('The block cannot be signed');
        }
        this.hash = this.calculateHash(true);
        const sig = signingKey.sign(this.hash, 'base64');
        this.signature = sig.toDER('hex');
        return this;
    }
    getVotes() {
        var _a;
        if (!this.hasValidVotes()) {
            throw new Error('Invalid votes');
        }
        return [...(_a = this.votes) !== null && _a !== void 0 ? _a : []];
    }
    hasValidVotes() {
        for (const vote of this.votes) {
            if (!this.isValidVote(vote))
                return false;
        }
        return true;
    }
    getVoteHash(voterAddress, vote) {
        return sha256_1.default(`${voterAddress}/${this.hash}/${vote}`).toString();
    }
    addVote(vote) {
        if (this.isValidVote(vote)) {
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
    isValidVote(vote) {
        const keyGen = BlockData_1.BlockData.ec.keyFromPublic(vote.voterAddress, 'hex');
        return keyGen.verify(this.getVoteHash(vote.voterAddress, vote.vote), vote.signature);
    }
    getVoteResult() {
        const result = {
            ok: [],
            nok: []
        };
        for (const vote of this.votes) {
            if (!this.isValidVote(vote)) {
                throw new Error('You cannot get the result with invalid vote');
            }
            if (vote.vote) {
                result.ok.push(vote);
            }
            else {
                result.nok.push(vote);
            }
        }
        return result;
    }
    vote(signingKey) {
        const isValidHash = this.isValidHash();
        this.mineBlock(Blockchain_1.Blockchain.difficulty);
        const voterAddress = signingKey.getPublic('hex');
        const vote = isValidHash && this.isValid(Blockchain_1.Blockchain.difficulty) ? true : false;
        const hash = this.getVoteHash(voterAddress, vote);
        const signature = signingKey.sign(hash, 'base64').toDER('hex');
        const existingVote = this.votes.find((item) => item.voterAddress === voterAddress);
        if (existingVote) {
            throw new Error('You cannot vote twice');
        }
        return {
            voterAddress,
            vote,
            signature
        };
    }
    calculateHash(includeVotes = false) {
        const transactions = this.transactions.map((transaction) => {
            Block.definePrototypeOfTransaction(transaction);
        });
        return sha256_1.default(`${this.index}${this.previousHash}${this.timestamp}${this.validatorAddress}${includeVotes ? JSON.stringify(this.votes) : ''}${JSON.stringify(transactions)}${this.nonce}`).toString();
    }
    mineBlock(difficulty, includeVotes = false) {
        console.log('Mine block... ', this.index, includeVotes, this.calculateHash(includeVotes));
        while (!this.isCorrectHash(difficulty)) {
            this.nonce++;
            this.hash = this.calculateHash(includeVotes);
        }
        console.log('Mined block : ', this.index, this.hash);
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
            return false;
        }
        return publicKey.verify(this.calculateHash(true), this.signature);
    }
    isValid(difficulty) {
        var _a, _b, _c;
        const result = (this.isCorrectHash(difficulty) && this.isValidHash(!!((_a = this.signature) === null || _a === void 0 ? void 0 : _a.length)));
        if (!((_b = this.signature) === null || _b === void 0 ? void 0 : _b.length))
            return result;
        if (!result)
            return false;
        if (((_c = this.signature) === null || _c === void 0 ? void 0 : _c.length) && !this.votes.length)
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
}
exports.Block = Block;
//# sourceMappingURL=Block.js.map