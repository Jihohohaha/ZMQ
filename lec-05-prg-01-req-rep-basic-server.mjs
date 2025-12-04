import zmq from "zeromq";

const socket = new zmq.Reply();
await socket.bind("tcp://*:5555");

while (true) {
 
    const [message] = await socket.receive();
    console.log("Received request: " + message.toString());

    await new Promise(resolve => setTimeout(resolve, 1000));

    await socket.send("World");
}