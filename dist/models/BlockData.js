"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockData = exports.BlockDataType = void 0;
const elliptic_1 = require("elliptic");
const sha256_1 = __importDefault(require("crypto-js/sha256"));
const uuid_1 = require("uuid");
var BlockDataType;
(function (BlockDataType) {
    BlockDataType["transaction"] = "transaction";
    BlockDataType["security"] = "security";
    BlockDataType["user"] = "user";
    BlockDataType["loan"] = "loan";
})(BlockDataType = exports.BlockDataType || (exports.BlockDataType = {}));
class BlockData {
    constructor(fromAddress, toAddress, id = uuid_1.v4()) {
        this.id = id;
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.createdAt = Date.now();
        this.updatedAt = this.createdAt;
    }
    calculateHash() {
        return this.hashData(this.getData());
    }
    isValid() {
        var _a, _b;
        if (this.fromAddress === null)
            return true;
        if (this.hash !== this.calculateHash()) {
            throw new Error('Invalid hash');
        }
        if (!((_a = this.signature) === null || _a === void 0 ? void 0 : _a.length)) {
            throw new Error('No signature for this transaction');
        }
        const publicKey = BlockData.ec.keyFromPublic(this.fromAddress, 'hex');
        if (!((_b = this.signature2) === null || _b === void 0 ? void 0 : _b.length)) {
            return publicKey.verify(this.calculateHash(), this.signature);
        }
        else if (this.previousHash && this.toAddress) {
            const publicKey2 = BlockData.ec.keyFromPublic(this.toAddress, 'hex');
            return publicKey.verify(this.previousHash, this.signature) && publicKey2.verify(this.calculateHash(), this.signature2);
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
        var _a, _b, _c, _d;
        return sha256_1.default(`${(_a = this.id) !== null && _a !== void 0 ? _a : ''}${this.createdAt}${this.fromAddress}${(_b = this.toAddress) !== null && _b !== void 0 ? _b : ''}${(_c = this.previousHash) !== null && _c !== void 0 ? _c : ''}${(_d = this.deletedAt) !== null && _d !== void 0 ? _d : ''}${JSON.stringify(data)}`).toString();
    }
}
exports.BlockData = BlockData;
BlockData.ec = new elliptic_1.ec('secp256k1');
//# sourceMappingURL=BlockData.js.map