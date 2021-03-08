import {Blockchain} from "./models/Blockchain";
import {Block} from "./models/Block";
import {Transaction} from "./models/Transaction";
import {ec as EC} from 'elliptic';
import {Security} from "./models/Security";
import {Loan} from "./models/Loan";

const ec = new EC('secp256k1');

const masterKey = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e910');
const masterToken = masterKey.getPublic('hex');

const myKey = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b6');
const myAddress = myKey.getPublic('hex');

const myKey2 = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b7');
const myAddress2 = myKey2.getPublic('hex');

const myKey3 = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b8');
const myAddress3 = myKey3.getPublic('hex');
console.log('my address : ', myAddress);

const sg = myKey.sign('true', 'base64').toDER('hex');

console.log('verify : ', ec.keyFromPublic(myAddress2, 'hex').verify('false', sg));

const xrpawn = new Blockchain(masterKey, [
  (new Transaction(masterToken, myAddress, 30000)),
  (new Transaction(masterToken, myAddress2, 2453)),
  (new Transaction(masterToken, myAddress3, 1000)),
]);

/*
const security = new Security(myAddress, {
  name: 'PS4',
  value: 500,
  buyAt: 2345676543
});

//security.sign(myKey);
xrpawn.addSecurity(security, myKey);

 */

console.log('xrpawn balance : ', xrpawn.getBalanceOfAddress(myAddress));

const transaction = new Transaction(myAddress3, myAddress2, 200);
transaction.sign(myKey3);
xrpawn.addTransaction(transaction);

const block = xrpawn.generateBlock(myAddress);

if (block) {

  xrpawn.voteAsValidator(myKey, block);

  // block.addVote(block.vote(myKey));
  block.addVote(block.vote(myKey2), xrpawn);
  block.addVote(block.vote(myKey3), xrpawn);


  console.log('Result : ', block.getVoteResult(xrpawn));

  xrpawn.addBlock(block, myKey);
} else {
  console.log('Invalid block');
}

console.log('Chain Length : ', xrpawn.chain.length);
console.log('isValid : ', xrpawn.isChainValid());
console.log('xrpawn balance myAddress : ', xrpawn.getBalanceOfAddress(myAddress));
console.log('xrpawn balance myAddress2 : ', xrpawn.getBalanceOfAddress(myAddress2));
console.log('xrpawn balance myAddress3 : ', xrpawn.getBalanceOfAddress(myAddress3));

