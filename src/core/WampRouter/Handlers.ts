import {v4 as uuid4} from 'uuid';
import WAMP from './Protocol';
import log from './Log';
import {Session} from "./Session";

type Handler = (session: Session, args: any) => any;

export const handlers: {
  [name in keyof Partial<typeof WAMP>]: Handler;
} = {
  [WAMP.HELLO]: (session, args) => {
    log.trace('New session :' + session.id);
    var msg = [
      WAMP.WELCOME,
      session.id,
      {
        "roles": {
          "dealer": {}
        }
      }];
    session.send(msg);
  },
  [WAMP.GOODBYE]: (session, args) => {
    var msg = [
      WAMP.GOODBYE,
      {},
      "wamp.error.goodbye_and_out"
    ];
    session.send(msg, function (error) {
      session.terminate(1000, "Client closed WAMP session");
    });
  },
  [WAMP.REGISTER]: (session, msg = []) => {
    const request = msg.shift();
    const options = msg.shift();
    const procUri = msg.shift();

    if (!session.getRouter().hasRPC(procUri)) {
      var regId = session.register(procUri);
      session.getRouter().registerRPC(procUri, function (invId, _session, args) {
        log.trace('Invoking RPC ' + procUri, args);
        session.send([
          WAMP.INVOCATION,
          invId,
          regId,
          {},
          args ?? []
        ]);
      }, session);
      session.send([
        WAMP.REGISTERED,
        request,
        regId
      ]);
    } else {
      session.send([
        WAMP.ERROR,
        WAMP.REGISTER,
        request,
        {},
        "wamp.error.procedure_already_exists"
      ]);
    }
  },
  [WAMP.CALL]: (session, msg = []) => {
    const callId = msg.shift();
    const options = msg.shift();
    const procUri = msg.shift();
    const args = msg.shift();


    if (!session.getRouter().hasRPC(procUri)) {
      session.send([
        WAMP.ERROR,
        WAMP.CALL,
        callId,
        {},
        "wamp.error.no_such_procedure"
      ]);
    } else {
      session
        .getRouter()
        .callRPC(procUri, session, ...args)
        .then((result) => {
          session.send([
            WAMP.RESULT,
            callId,
            {},
            result ? [result] : undefined
          ]);
        })
        .catch((e) => {
          console.error(e);
          session.send([
            WAMP.ERROR,
            WAMP.CALL,
            callId,
            {},
            "wamp.error.callee_failure"
          ]);
        });
    }
  },
  [WAMP.UNREGISTER]: (session, args) => {
    const requestId = args.shift();
    const registrationId = args.shift();
    const uri = session.unregister(registrationId);
    if (!uri) {
      session.send([
        WAMP.ERROR,
        WAMP.UNREGISTER,
        requestId,
        {},
        "wamp.error.no_such_registration"
      ]);
    } else {
      if (session.getRouter().unregisterRPC(uri, session)) {
        session.send([
          WAMP.UNREGISTERED,
          requestId
        ]);
      }
    }
  },
  [WAMP.YIELD]: (session, msg = []) => {
    var invId = msg.shift();
    var options = msg.shift();
    var args = msg.shift();
    session.getRouter().respondRPC(invId, null, args, session);
  },
  [WAMP.SUBSCRIBE]: (session, msg = []) => {
    const requestId = msg.shift();
    const options = msg.shift();
    const topicUri = msg.shift();

    var subsId = session.subscribe(topicUri);
    session
      .getRouter()
      .subscribeTopic(topicUri, (publicationId, _session, ...args) => {
        log.trace('eventCallback', publicationId, args);
        session!.send([
          WAMP.EVENT,
          subsId,
          publicationId,
          {},
          args ?? []
        ]);
      }, subsId, session);
    log.trace('Subscribe Topic ' + topicUri);
    session.send([
      WAMP.SUBSCRIBED,
      requestId,
      subsId
    ]);
  },
  [WAMP.UNSUBSCRIBE]: (session, args = []) => {
    var requestId = args.shift();
    var subsid = args.shift();
    var topicUri = session.unsubscribe(subsid);
    if (!topicUri || !session.getRouter().hasTopic(topicUri)) {
      session.send([
        WAMP.ERROR,
        WAMP.UNSUBSCRIBE,
        requestId,
        {},
        "wamp.error.no_such_subscription"
      ]);
      log.trace('Unsubscription error ' + topicUri);
    } else {
      session.getRouter().unsubscribeTopic(topicUri, subsid, session);
      session.send([
        WAMP.UNSUBSCRIBED,
        requestId
      ]);
      log.trace('Unsubscribe Topic ' + topicUri);
    }
  },
  [WAMP.PUBLISH]: (session, msg = []) => {
    const requestId = msg.shift();
    const options = msg.shift();
    const topicUri = msg.shift();
    const ack = options && options.acknowledge;
    const publicationId = uuid4();
    const args = msg.shift() || [];
    const kwargs = msg.shift() || {};

    if (ack) {
      session.send([
        WAMP.PUBLISHED,
        requestId,
        publicationId
      ]);
      log.trace('Publish Topic with ack ' + topicUri + ' ' + publicationId);
    } else {
      log.trace('Publish Topic without ack ' + topicUri + ' ' + publicationId);
    }

    session.getRouter().publish(topicUri, publicationId, session, ...[...args ?? [], ...kwargs ?? []]);
  },
  [WAMP.EVENT]: (session, args = []) => {
    var subscriptionId = args.shift();
    var publicationId = args.shift();
    log.trace('Event received subscriptionId ' + subscriptionId
      + ' publicationId ' + publicationId);
  },
  [WAMP.ERROR]: (session, msg = []) => {
    var requestType = msg.shift();
    var requestId = msg.shift();
    var details = msg.shift();
    var errorUri = msg.shift();
    var args = msg.shift() || [];
    var kwargs = msg.shift() || {};

    const err = new Error(details);
    if (requestType === WAMP.INVOCATION) {
      const invId = requestId;
      session.getRouter().respondRPC(invId, err, args);
    }
  }
};

export default handlers;
