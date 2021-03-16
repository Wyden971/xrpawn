import { ec as EC } from "elliptic";
import { BlockData, BlockDataType } from "./BlockData";
const ec = new EC('secp256k1');
export class User extends BlockData {
    constructor(fromAddress, data, id) {
        super(fromAddress, fromAddress, id);
        this.type = BlockDataType.user;
        this.profilePicture = data.profilePicture;
        this.companyName = data.companyName;
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
            companyName: this.companyName,
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
