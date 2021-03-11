import {v4 as uuid4} from 'uuid';
import WAMP from './Protocol';
import handlers from './Handlers';
import log from './Log';
import {Router} from './Router';
import WebSocket from 'ws';

export class Session {

  public readonly id: string;
  private router: Router;
  private registeredUris: { [id: string]: string } = {};
  private subscribedUris: { [id: string]: string } = {};
  private client: WebSocket;


  constructor(router: Router, client: WebSocket) {
    this.id = uuid4();
    this.client = client;
    this.router = router;
    this.client.on('message', this.onMessage.bind(this));
  }

  public getRouter() {
    return this.router;
  }

  private trace(msg: string) {
    var trace = "[SESSION][" +
      ((typeof this.id === 'undefined') ? "?" : this.id) +
      "] " + msg;
    log.trace(trace);
  }

  public register(uri: string) {
    const registrationId = uuid4();
    this.registeredUris[registrationId] = uri;
    return registrationId;
  };

  public unregister(id: string) {
    if (id in this.registeredUris) {
      const uri = this.registeredUris[id];
      delete this.registeredUris[id];
      return uri;
    }
    return false;
  };


  public subscribe(uri: string) {
    var subscriptionId = uuid4();
    this.subscribedUris[subscriptionId] = uri;
    return subscriptionId;
  };


  public unsubscribe(id: string) {
    if (id in this.subscribedUris) {
      var uri = this.subscribedUris[id];
      delete this.subscribedUris[id];
      return uri;
    }
    return false;
  };

  public send(msg: any, callback?: (error: any) => void) {
    const data = JSON.stringify(msg);
    var defaultCallback = (error: any) => {
      if (error) {
        log.trace("Failed to send message: " + error);
        this.terminate(1011, "Unexpected error");
      }
    }
    this.trace('TX > ' + data);
    this.client.send(data, callback ?? defaultCallback);
  };

  close() {
    console.log('Graceful termination');
    // Graceful termination
    var msg = [
      WAMP.GOODBYE,
      {},
      "wamp.error.close_realm"
    ];
    this.send(msg, (error: any) => {
      this.terminate(1000, "Server closed WAMP session");
    });
  }

  terminate(code: number, reason: string) {
    log.trace('Closing WebSocket connection: [' +
      code + '] ' + reason);
    this.client.close(code, reason);
  };

  cleanup() {
    this.trace('Cleaning up session');
    for (const regId in this.registeredUris) {
      this.router.unregisterRPC(this.registeredUris[regId], this);
      delete this.registeredUris[regId];
    }
    for (const subId in this.subscribedUris) {
      this.router.unsubscribeTopic(this.subscribedUris[subId], subId, this);
      delete this.subscribedUris[subId];
    }
  };

  private onMessage(data: string) {
    var msg;

    try {
      msg = JSON.parse(data);
    } catch (e) {
      log.trace('invalid json');
      this.terminate(1003, "protocol violation");
      return;
    }
    if (!Array.isArray(msg)) {
      log.trace('msg not a list');
      this.terminate(1003, "protocol violation");
      return;
    }
    var type = msg.shift();
    if (!handlers[type]) {
      log.trace('unknown message type');
      this.terminate(1003, "protocol violation");
      return;
    }
    this.trace('RX < ' + data);
    handlers[type].apply(this.router, [this, msg]);
  }

  callRPC(uri: string, ...args: any) {
    for (const regId in this.registeredUris) {
      const registration = this.registeredUris[regId];
      if (registration === uri) {
        const invId = uuid4();
        this.send([
          WAMP.INVOCATION,
          invId,
          regId,
          {},
          args ?? []
        ]);
        break;
      }
    }
  }

  publish(uri: string, ...args: any) {
    for (const subscribeId in this.subscribedUris) {
      const subscribedUri = this.subscribedUris[subscribeId];
      if (subscribedUri === uri) {
        const publicationId = uuid4();
        this.send([
          WAMP.EVENT,
          subscribeId,
          publicationId,
          {},
          args ?? []
        ]);
        break;
      }
    }
  }
}
