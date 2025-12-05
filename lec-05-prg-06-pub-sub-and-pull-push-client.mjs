import zmq from "zeromq";

async function main() {
    const subscriber = new zmq.Subscriber();
    subscriber.subscribe("");
    subscriber.connect("tcp://localhost:5557");
    const publisher = new zmq.Push();
    publisher.connect("tcp://localhost:5558");

    let receivePromise = null;

    while (true) {
        if (receivePromise === null) {
            receivePromise = subscriber.receive();
        }

        const timeout = new Promise(resolve => setTimeout(() => resolve(null), 100));
        const result = await Promise.race([receivePromise, timeout]);

        if (result !== null) {
            const [message] = result;
            console.log("I: received message ", message.toString());
            receivePromise = null; 
        } else {
            const rand = Math.floor(Math.random() * 100) + 1;
            if (rand < 10) {
                await publisher.send(String(rand));
                console.log("I: sending message ", rand);
            }
        }
    }
}

main();