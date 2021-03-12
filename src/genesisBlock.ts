import {Block} from "./models/Block";

const genesisBlock = Object.setPrototypeOf({
  "id": 0,
  "validatorAddress": "0484c03b6ab95637b1bd6f0eddabbb293c5eab61833747d047a0ab8628f7373e32db662ea8d16346cfadc2972bcd9976dbd300f63bc3c056f446864c6ba2c7da88",
  "transactions": [
    {
      "id": "a6de2504-f027-4aac-b76c-0aaedcd12cc3",
      "fromAddress": "0484c03b6ab95637b1bd6f0eddabbb293c5eab61833747d047a0ab8628f7373e32db662ea8d16346cfadc2972bcd9976dbd300f63bc3c056f446864c6ba2c7da88",
      "toAddress": "04a78f9df9d68223fc980f14b111bd7d57c279de0a257c43fa389989fd958790836c5fe4222ec084481e362c00befa3a28cf7f1df76819d311d07b129ad8c7c2f5",
      "createdAt": "2021-03-11 00:00:00",
      "updatedAt": "2021-03-11 00:00:00",
      "type": "transaction",
      "amount": 30000,
      "hash": "b0b8604ae0d2a99d7cd874a9f9b52d1caeb3d298ed010e42e3f02ff9fd1fe2e6",
      "signature": "3046022100b2d51ad74f5f2e688046d11a7488b2ab92b82f20f00ebd712ea2827ea4dc58de022100cf5338562f699c4b5b7bcb88f7a990f26aa9e00e288f8a7cc1fbe250140d51a6"
    },
    {
      "id": "fc0cf7e7-47db-44e3-ba2e-bde91cb03453",
      "fromAddress": "0484c03b6ab95637b1bd6f0eddabbb293c5eab61833747d047a0ab8628f7373e32db662ea8d16346cfadc2972bcd9976dbd300f63bc3c056f446864c6ba2c7da88",
      "toAddress": "04bb94ee1704c94f992ac35582f0af2983ac7958e6b528d03feec5f164a9a6efa1d6a1f65bd028db6b690e8419d1a1addb1b8df234c02ef830c6db3a57e7bf2fa9",
      "createdAt": "2021-03-11 00:00:00",
      "updatedAt": "2021-03-11 00:00:00",
      "type": "transaction",
      "amount": 2453,
      "hash": "7ef913d0b2f7cf4a7edf2270452a3e4d02a55a99b5516c17fd5f4cc322845aa8",
      "signature": "3045022100dd073d53310c819fe9c2a37f150e271565bc578bcf3c0a807d88f4a0f819f346022071a7bcdda17a82f330a2a15f111955449a95e505f27946918617d580158884ac"
    },
    {
      "id": "a6f83b24-f74d-4c37-97ff-5f9d7a6b53cf",
      "fromAddress": "0484c03b6ab95637b1bd6f0eddabbb293c5eab61833747d047a0ab8628f7373e32db662ea8d16346cfadc2972bcd9976dbd300f63bc3c056f446864c6ba2c7da88",
      "toAddress": "04f697da0ebee684b43b7587d3a4bd47fcafac1034948f0be2c7e616cf35570b5e136a5f6580e17337ad319911fc31d10e9bd734d584cebaeb853c71fdfed741a6",
      "createdAt": "2021-03-11 00:00:00",
      "updatedAt": "2021-03-11 00:00:00",
      "type": "transaction",
      "amount": 1000,
      "hash": "6172b4e9b01ec4af68768e192d51c60a0c1128fddf4cad83b544c14267179b65",
      "signature": "3046022100b885c69587b3a50298834c8956bf5a13f40a653a751b88355509584e8d622866022100d2cabd733f6c4b064b18fc78dff7ecdb1de2f131bb92a2c7d2f0d013cd945a97"
    }
  ],
  "previousHash": "",
  "hash": "640191333f96339dbd0370627bf769ebaf6547faa3f095eaced42d6a684dea53",
  "signature": "3045022100b907d30953af6d0762f062d2895097fca9819fb31e70e8f55d15e5e7962259b20220520add2e77e0395f0b2e4226c97a13ad320e2704cd72b26b0a147e840dea2733",
  "votes": [],
  "createdAt": "2021-03-11 00:00:00",
  "nonce": 0
}, Block.prototype);

export default genesisBlock;
