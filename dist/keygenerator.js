"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elliptic_1 = require("elliptic");
const ec = new elliptic_1.ec('secp256k1');
const key = ec.genKeyPair();
const publicKey = key.getPublic('hex');
const privateKey = key.getPrivate('hex');
console.log();
console.log('publicKey: ', publicKey);
console.log();
console.log('privateKey: ', privateKey);
//# sourceMappingURL=keygenerator.js.map