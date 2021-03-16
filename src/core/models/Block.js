import SHA256 from 'crypto-js/sha256';
import { Transaction } from "./Transaction";
import { Security } from "./Security";
import { User } from "./User";
import { Loan } from "./Loan";
import { BlockData, BlockDataType } from "./BlockData";
export class Block {
    constructor(id, createdAt, validatorAddress, transactions, previousHash = '') {
        this.votes = [];
        this.id = id;
        this.createdAt = createdAt;
        this.validatorAddress = validatorAddress;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }
    static definePrototypeOfTransaction(object) {
        let prototype;
        switch (object.type) {
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
    static fromData(data) {
        if (typeof data.transactions === 'string')
            data.transactions = JSON.parse(data.transactions);
        if (typeof data.votes === 'string')
            data.votes = JSON.parse(data.votes);
        const block = Object.setPrototypeOf(data, Block.prototype);
        block.transactions.map((tx) => Block.definePrototypeOfTransaction(tx));
        return block;
    }
    getInsertSQL(table) {
        return {
            update: `UPDATE \`${table}\` SET (id, validatorAddress, transactions, previousHash, nonce, hash, signature, votes, createdAt) VALUES (?,?,?,?,?,?,?,?,?) WHERE id = ${this.id}`,
            query: `INSERT INTO \`${table}\` (id, validatorAddress, transactions, previousHash, nonce, hash, signature, votes, createdAt) VALUES (?,?,?,?,?,?,?,?,?);`,
            variables: [this.id, this.validatorAddress, JSON.stringify(this.transactions), this.previousHash, this.nonce, this.hash, this.signature, JSON.stringify(this.votes), this.createdAt]
        };
    }
    generateHash() {
        this.hash = this.calculateHash();
        return this;
    }
    getVotes() {
        var _a;
        return [...(_a = this.votes) !== null && _a !== void 0 ? _a : []];
    }
    hasValidVotes() {
        if (this.id === 0)
            return true;
        const votes = this.votes.filter((vote) => this.isValidVote(vote));
        if (votes.length < 3) {
            console.warn('3 votes are required');
            return false;
        }
        return true;
    }
    getVoteHash(voterAddress, value, asValidator) {
        return SHA256(`${voterAddress}${asValidator}${value}`).toString();
    }
    addVote(vote) {
        if (this.isValidVote(vote)) {
            const existingVote = this.votes.find((item) => item.voterAddress === vote.voterAddress);
            if (existingVote) {
                throw new Error('You cannot vote twice');
            }
            console.log('Vote added :', vote.voterAddress);
            this.votes.push(vote);
        }
        else {
            throw new Error('you cannot add a not valid vote');
        }
    }
    isValidVote(vote) {
        const keyGen = BlockData.ec.keyFromPublic(vote.voterAddress, 'hex');
        if (this.calculateHash(false) !== vote.value) {
            console.error('Invalid hash');
            return false;
        }
        const validVoteResult = keyGen.verify(this.getVoteHash(vote.voterAddress, vote.value, vote.asValidator), vote.signature);
        if (!validVoteResult) {
            console.error('Invalid vote result');
            return false;
        }
        return true;
    }
    getVoteResult(balances) {
        console.log('getVoteResult.balances : ', balances);
        const limit = 10000000;
        const total = this.votes.reduce((result, item) => result + balances[item.voterAddress], 0);
        console.log('this.votes : ', this.votes);
        const hashes = this.votes.reduce((result, item) => {
            var _a;
            return Object.assign(Object.assign({}, result), { [item.value]: [...((_a = result[item.value]) !== null && _a !== void 0 ? _a : []), ((balances[item.voterAddress] / total) * limit)] });
        }, {});
        console.log('hashes : ', hashes);
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
        console.log('orderedVotes : ', orderedVotes);
        return orderedVotes;
    }
    vote(signingKey) {
        const voterAddress = signingKey.getPublic('hex');
        const asValidator = (voterAddress === this.validatorAddress);
        const value = this.calculateHash(false);
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
    getDataToHash(includeVotes = true) {
        var _a;
        const transactions = this.transactions.map((transaction) => Block.definePrototypeOfTransaction(transaction));
        return JSON.stringify({
            id: this.id,
            previousHash: this.previousHash,
            createdAt: this.createdAt,
            votes: includeVotes ? this.votes : [],
            transactions: transactions,
            nonce: (_a = this.nonce) !== null && _a !== void 0 ? _a : 0
        });
    }
    calculateHash(includeVotes = true) {
        const dataToHash = this.getDataToHash(includeVotes);
        const hash = SHA256(dataToHash).toString();
        return hash;
    }
    isValidHash() {
        return this.hash === this.calculateHash();
    }
    hasValidSignature() {
        var _a;
        const publicKey = BlockData.ec.keyFromPublic(this.validatorAddress, 'hex');
        if (!((_a = this.signature) === null || _a === void 0 ? void 0 : _a.length)) {
            console.warn('no signature');
            return false;
        }
        const result = publicKey.verify(this.calculateHash(), this.signature);
        if (!result) {
            console.warn('Bad signature');
        }
        return result;
    }
    isValid() {
        var _a, _b, _c, _d;
        const result = this.isValidHash();
        if (!((_a = this.signature) === null || _a === void 0 ? void 0 : _a.length)) {
            if (!result)
                console.warn('not signed');
            return result;
        }
        if (!result) {
            console.log('incorrect hash');
            return false;
        }
        if (((_b = this.signature) === null || _b === void 0 ? void 0 : _b.length) && ((_c = this.votes) === null || _c === void 0 ? void 0 : _c.length) < 3 && this.id > 0) {
            if (!((_d = this.votes) === null || _d === void 0 ? void 0 : _d.length))
                console.warn('no votes');
            else
                console.warn('The block should have minimum 3 votes');
            return false;
        }
        return this.hasValidSignature() && this.hasValidVotes();
    }
    hasValidTransactions() {
        for (const tx of this.transactions) {
            console.log('hasValidTransactions : ', tx.id, tx.hash, tx.calculateHash());
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
        if (this.signature && !signingKey.verify(this.hash, this.signature)) {
            throw new Error('You cannot sign the block you are not a validator');
        }
        this.hash = this.calculateHash();
        const sig = signingKey.sign(this.hash, 'base64');
        this.signature = sig.toDER('hex');
        return this;
    }
    compare(block) {
        if (block.hash !== this.hash || block.previousHash !== this.previousHash || block.validatorAddress !== this.validatorAddress || block.createdAt !== this.createdAt || block.nonce !== this.nonce || block.signature !== this.signature) {
            console.log('no data matching');
            return false;
        }
        const badVotes = this.votes.some((vote) => {
            return !block.votes.find((item) => item.voterAddress === vote.voterAddress && item.asValidator === vote.asValidator && item.signature === vote.signature && item.value === vote.value);
        });
        if (badVotes) {
            console.log('bad votes');
            return false;
        }
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
    getAddresses() {
        const addresses = [this.validatorAddress];
        this.transactions.forEach((transaction) => {
            if (!addresses.includes(transaction.fromAddress)) {
                addresses.push(transaction.fromAddress);
            }
            if (!addresses.includes(transaction.toAddress)) {
                addresses.push(transaction.toAddress);
            }
        });
        this.votes.forEach((vote) => {
            if (!addresses.includes(vote.voterAddress)) {
                addresses.push(vote.voterAddress);
            }
        });
        return addresses;
    }
}
