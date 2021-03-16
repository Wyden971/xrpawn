import { ec as EC } from "elliptic";
import SHA256 from "crypto-js/sha256";
import { Blockchain } from "./Blockchain";
export var BlockDataType;
(function (BlockDataType) {
    BlockDataType["transaction"] = "transaction";
    BlockDataType["security"] = "security";
    BlockDataType["user"] = "user";
    BlockDataType["loan"] = "loan";
})(BlockDataType || (BlockDataType = {}));
export class BlockData {
    constructor(fromAddress, toAddress, id) {
        this.id = id;
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.createdAt = Math.round(Date.now() / 1000);
        this.updatedAt = Math.round(Date.now() / 1000);
    }
    calculateHash() {
        return this.hashData(this.getData());
    }
    isValid() {
        var _a, _b;
        if (this.fromAddress === null)
            return true;
        if (this.hash !== this.calculateHash()) {
            throw new Error('Invalid hash : ' + this.hash);
        }
        if (!((_a = this.signature) === null || _a === void 0 ? void 0 : _a.length)) {
            throw new Error('No signature for this transaction');
        }
        const publicKey = BlockData.ec.keyFromPublic(this.fromAddress, 'hex');
        if (!((_b = this.signature2) === null || _b === void 0 ? void 0 : _b.length)) {
            return publicKey.verify(this.hash, this.signature);
        }
        else if (this.previousHash && this.toAddress) {
            const publicKey2 = BlockData.ec.keyFromPublic(this.toAddress, 'hex');
            return publicKey.verify(this.previousHash, this.signature) && publicKey2.verify(this.hash, this.signature2);
        }
        else {
            return false;
        }
    }
    sign(signingKey) {
        const address = signingKey.getPublic('hex');
        if (!address || address === this.fromAddress) {
            if (this.fromAddress === null)
                return;
            return this.signAsFromAddress(signingKey);
        }
        else if (address === this.toAddress)
            return this.signAsToAddress(signingKey);
        else {
            throw new Error('You cannot sign for other wallets');
        }
    }
    signAsFromAddress(signingKey) {
        console.log('signAsFromAddress');
        if (signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('You cannot sign transaction for other wallets');
        }
        this.hash = this.calculateHash();
        const sig = signingKey.sign(this.hash, 'base64');
        this.signature = sig.toDER('hex');
        return this;
    }
    signAsToAddress(signingKey) {
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
    hashData(data) {
        var _a, _b;
        const dataToHash = `${this.id}/${this.createdAt}/${this.fromAddress}/${this.toAddress}/${(_a = this.previousHash) !== null && _a !== void 0 ? _a : null}/${(_b = this.deletedAt) !== null && _b !== void 0 ? _b : null}/${JSON.stringify(data)}`;
        return SHA256(dataToHash).toString();
    }
    asTransaction() {
        return this;
    }
    asLoan() {
        return this;
    }
    asSecurity() {
        return this;
    }
    getSqlData() {
        var _a, _b;
        const data = Object.assign({ id: this.id, type: this.type, fromAddress: this.fromAddress, toAddress: this.toAddress, createdAt: this.createdAt, updatedAt: this.updatedAt, signature: this.signature, signature2: (_a = this.signature2) !== null && _a !== void 0 ? _a : null, hash: this.hash, previousHash: (_b = this.previousHash) !== null && _b !== void 0 ? _b : null }, this.getData());
        return data;
    }
    getInsertSQL(table) {
        const data = this.getSqlData();
        const keys = Object.keys(data).join(',');
        const values = Object.values(data).map((item) => item !== null && item !== void 0 ? item : null);
        const valuesPlace = values.map((item) => '?').join(',');
        return {
            query: `INSERT INTO \`${table}\` (${keys}) VALUES (${valuesPlace});`,
            variables: values
        };
    }
    check(balances, inGenesisBlock = false) {
        var _a, _b, _c;
        const oldBalances = Object.assign({}, balances);
        switch (this.type) {
            case BlockDataType.transaction:
                const amount = this.asTransaction().amount - (inGenesisBlock ? 0 : Blockchain.STATIC_FEE);
                if (!inGenesisBlock)
                    balances[this.fromAddress] = ((_a = balances[this.fromAddress]) !== null && _a !== void 0 ? _a : 0) - amount;
                balances[this.toAddress] = ((_b = balances[this.toAddress]) !== null && _b !== void 0 ? _b : 0) + amount;
                break;
            case BlockDataType.loan:
                balances[this.fromAddress] = ((_c = balances[this.fromAddress]) !== null && _c !== void 0 ? _c : 0) - Blockchain.STATIC_FEE;
                break;
        }
        if (!inGenesisBlock && balances[this.fromAddress] <= 0) {
            Object.assign(balances, oldBalances);
            return false;
        }
        return true;
    }
}
BlockData.ec = new EC('secp256k1');
