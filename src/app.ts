import {Blockchain} from "./models/Blockchain";
import {Block} from "./models/Block";
import {Transaction} from "./models/Transaction";
import {ec as EC} from 'elliptic';
import {Security} from "./models/Security";
import {Loan} from "./models/Loan";

const ec = new EC('secp256k1');

const myKey = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b6');
const myAddress = myKey.getPublic('hex');

const myKey2 = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b7');
const myAddress2 = myKey2.getPublic('hex');
console.log('my address : ', myAddress);

const sg = myKey.sign('true', 'base64').toDER('hex');

console.log('verify : ', ec.keyFromPublic(myAddress2, 'hex').verify('false', sg));

const xrpawn = new Blockchain();


const security = new Security(myAddress, {
  name: 'PS4',
  value: 500,
  buyAt: 2345676543
});

//security.sign(myKey);
xrpawn.addSecurity(security, myKey);

console.log('xrpawn balance : ', xrpawn.getBalanceOfAddress(myAddress));

const block = xrpawn.generateBlock(myKey);
if (block) {

  const tx = new Transaction(myAddress, myAddress2, xrpawn.getBalanceOfAddress(myAddress));
  block.addVote(block.vote(myKey, tx));
  const block2 = Object.setPrototypeOf({...block}, Object.getPrototypeOf(block)) as Block;

  const tx2 = new Transaction(myAddress2, myAddress2, xrpawn.getBalanceOfAddress(myAddress));
  block.addVote(block.vote(myKey2, tx2));

  console.log('Result : ', block.getVoteResult());

} else {
  console.log('Invalid block');
}

console.log('Chain Length : ', xrpawn.chain.length);
console.log('isValid : ', xrpawn.isChainValid());
console.log('xrpawn balance : ', xrpawn.getBalanceOfAddress(myAddress));
