import { ec as EC } from "elliptic";
import { BlockData, BlockDataType } from "./BlockData";
const ec = new EC('secp256k1');
export class Loan extends BlockData {
    constructor(fromAddress, toAddress, data, id) {
        super(fromAddress, toAddress, id);
        this.type = BlockDataType.loan;
        this.securityId = data.securityId;
        this.expiresAt = data.expiresAt;
        this.startAt = data.startAt;
        this.endAt = data.endAt;
        this.rate = data.rate;
        this.amount = data.amount;
        this.interest = data.interest;
        this.acceptedAt = data.acceptedAt;
        this.refusedAt = data.refusedAt;
    }
    getData() {
        return {
            securityId: this.securityId,
            expiresAt: this.expiresAt,
            startAt: this.startAt,
            endAt: this.endAt,
            rate: this.rate,
            amount: this.amount,
            interest: this.interest,
            acceptedAt: this.acceptedAt,
            refusedAt: this.refusedAt,
        };
    }
    isValid() {
        var _a, _b, _c, _d;
        if (!((_a = this.signature) === null || _a === void 0 ? void 0 : _a.length)) {
            throw new Error('No signature for this transaction');
        }
        const isBlockDataValid = super.isValid();
        if (!this.toAddress) {
            console.log('toAddress is required');
            return isBlockDataValid;
        }
        if (!isBlockDataValid) {
            console.log('Loan is invalid');
            return false;
        }
        if (!((_b = this.signature2) === null || _b === void 0 ? void 0 : _b.length) && !this.acceptedAt)
            return true;
        if ((!((_c = this.signature2) === null || _c === void 0 ? void 0 : _c.length) && (this.acceptedAt || this.refusedAt)) || (((_d = this.signature2) === null || _d === void 0 ? void 0 : _d.length) && !this.acceptedAt && !this.refusedAt)) {
            throw new Error('You cannot sign without accept or refuse the Loan');
        }
        if (this.acceptedAt && this.refusedAt) {
            throw new Error('You cannot accept and refuse the Loan');
            return false;
        }
        const publicKey2 = ec.keyFromPublic(this.toAddress, 'hex');
        return publicKey2.verify(this.calculateHash(), this.signature2);
    }
}
