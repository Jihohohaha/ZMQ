import zmq from "zeromq";

async function main(argv) {

    const subscriber = new zmq.Subscriber();
    subscriber.subscribe("");
    subscriber.connect("tcp://localhost:5557");
    const publisher = new zmq.Push();
    publisher.connect("tcp://localhost:5558");

    const clientID = argv[2];
    let receivePromise = null;

    while (true) {
        if (receivePromise === null) {
            receivePromise = subscriber.receive();
        }

        const timeout = new Promise(resolve => setTimeout(() => resolve(null), 100));
        const result = await Promise.race([receivePromise, timeout]);

        if (result !== null) {
            const [message] = result;
            console.log("%s: receive status => %s", clientID, message.toString());
            receivePromise = null;
        } else {
            const rand = Math.floor(Math.random() * 100) + 1;
            if (rand < 10) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const msg = "(" + clientID + ":ON)";
                await publisher.send(msg);
                console.log("%s: send status - activated", clientID);
            } else if (rand > 90) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const msg = "(" + clientID + ":OFF)";
                await publisher.send(msg);
                console.log("%s: send status - deactivated", clientID);
            }
        }
    }
}


main(process.argv);