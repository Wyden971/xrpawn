import autobahn from "autobahn";
import {ec as EC} from "elliptic";
import SHA256 from "crypto-js/sha256";

export class Client {
  static DEFAULT_PORT = 8889;
  private ip: string;
  private port: number;
  private session?: autobahn.Session;
  private signingKey: EC.KeyPair;

  constructor(signingKey: EC.KeyPair, clientIp: string, clientPort: number = Client.DEFAULT_PORT) {
    this.ip = clientIp;
    this.port = clientPort;
    this.signingKey = signingKey;
  }

  getSession() {
    return this.session;
  }

  connect(): Promise<autobahn.Session> {
    return new Promise((resolve, reject) => {
      let connection = new autobahn.Connection({
          url: `ws://${this.ip}:${this.port}`,
          realm: 'realm1',
        }
      );

      connection.onopen = (new_session) => {
        this.session = new_session;

        const address = this.getAddress();
        const hash = this.getAddressHash();
        const signature = this.signingKey.sign(hash, 'base64').toDER('hex');

        this.session
          .call('authentication', [address, hash, signature])
          .then((result) => {
            console.log('result : ', result);
            if (this.session) {
              this
                .session
                .register(address, () => {
                  return {
                    address,
                    hash,
                    signature
                  }
                })
                .then(() => resolve(new_session))
                .catch(reject);
            }
          })
          .catch(reject);
      };

      connection.onclose = function (reason, details: any) {
        console.log("connection 1", reason, details);
        return false;
      };
      connection.open();
    });
  }

  getAddress() {
    return this.signingKey.getPublic('hex');
  }

  getAddressHash() {
    return SHA256(this.getAddress()).toString();
  }
}
