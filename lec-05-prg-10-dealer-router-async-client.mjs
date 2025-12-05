import zmq from "zeromq";

async function clientTask(id) {
    const socket = new zmq.Dealer();
    const identity = String(id);
    socket.routingId = identity;
    socket.connect("tcp://localhost:5570");
    console.log("Client %s started", identity);

    let receivePromise = null;
    let reqs = 0;

    while (true) {
        reqs = reqs + 1;
        console.log("Req #%d sent..", reqs);
        await socket.send("request #" + reqs);

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (receivePromise === null) {
            receivePromise = socket.receive();
        }

        const timeout = new Promise(resolve => setTimeout(() => resolve(null), 1000));
        const result = await Promise.race([receivePromise, timeout]);

        if (result !== null) {
            const [msg] = result;
            console.log("%s received: %s", identity, msg.toString());
            receivePromise = null;
        }
    }
}

// usage: node lec-05-prg-10-dealer-router-async-client.mjs client_id
async function main(argv) {
    await clientTask(argv[2]);
}

main(process.argv);