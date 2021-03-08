"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elliptic_1 = require("elliptic");
const BlockData_1 = require("./BlockData");
const ec = new elliptic_1.ec('secp256k1');
class Security extends BlockData_1.BlockData {
    constructor(fromAddress, description, id, createdAt = Date.now()) {
        super(fromAddress);
        this.type = BlockData_1.BlockDataType.security;
        this.description = description;
    }
    getData() {
        return this.description;
    }
}
exports.Security = Security;
//# sourceMappingURL=Security.js.map