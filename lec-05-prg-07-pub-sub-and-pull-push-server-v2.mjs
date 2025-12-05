import zmq from "zeromq";

async function main() {
    // context and sockets
    const publisher = new zmq.Publisher();
    await publisher.bind("tcp://*:5557");
    const collector = new zmq.Pull();
    await collector.bind("tcp://*:5558");

    while (true) {
        const [message] = await collector.receive();
        console.log("server: publishing update => ", message.toString());
        await publisher.send(message);
    }
}

main();