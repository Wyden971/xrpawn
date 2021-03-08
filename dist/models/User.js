"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elliptic_1 = require("elliptic");
const BlockData_1 = require("./BlockData");
const ec = new elliptic_1.ec('secp256k1');
class User extends BlockData_1.BlockData {
    constructor(fromAddress, data) {
        super(fromAddress);
        this.type = BlockData_1.BlockDataType.user;
        this.profilePicture = data.profilePicture;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.dateOfBirth = data.dateOfBirth;
        this.address = data.address;
        this.city = data.city;
        this.country = data.country;
        this.email = data.email;
        this.phone = data.phone;
        this.additionalData = data.additionalData;
    }
    getData() {
        return {
            profilePicture: this.profilePicture,
            firstName: this.firstName,
            lastName: this.firstName,
            dateOfBirth: this.dateOfBirth,
            address: this.address,
            city: this.city,
            country: this.country,
            email: this.email,
            phone: this.phone,
            additionalData: this.additionalData,
        };
    }
}
exports.User = User;
//# sourceMappingURL=User.js.map