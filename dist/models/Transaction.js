"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elliptic_1 = require("elliptic");
const BlockData_1 = require("./BlockData");
const ec = new elliptic_1.ec('secp256k1');
var TransactionType;
(function (TransactionType) {
    TransactionType["transfert"] = "transfert";
    TransactionType["validator"] = "validator";
})(TransactionType = exports.TransactionType || (exports.TransactionType = {}));
class Transaction extends BlockData_1.BlockData {
    constructor(fromAddress, toAddress, amount) {
        super(fromAddress, toAddress);
        this.type = BlockData_1.BlockDataType.transaction;
        this.amount = amount;
    }
    getData() {
        return {
            amount: this.amount,
        };
    }
}
exports.Transaction = Transaction;
//# sourceMappingURL=Transaction.js.map