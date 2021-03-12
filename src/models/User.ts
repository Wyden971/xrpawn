import SHA256 from 'crypto-js/sha256';
import {ec as EC} from "elliptic";
import {v4 as uuid4, parse as uuidParse} from 'uuid'
import {BlockData, BlockDataType} from "./BlockData";
import {Block} from "./Block";

const ec = new EC('secp256k1');

export interface UserData {
  profilePicture: string;
  companyName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  additionalData: any;
}

export class User extends BlockData<UserData> implements UserData {
  public type = BlockDataType.user;
  public profilePicture: string;
  public companyName: string;
  public firstName: string;
  public lastName: string;
  public dateOfBirth: string;
  public address: string;
  public city: string;
  public country: string;
  public email: string;
  public phone: string;
  public additionalData: any;

  constructor(fromAddress: string, data: UserData, id: string) {
    super(fromAddress, fromAddress, id);
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

  getData(): UserData {
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
    }
  }

}

