import zmq from "zeromq";


console.log("Connecting to hello world server…");
const socket = new zmq.Request();
socket.connect("tcp://localhost:5555");

//  Do 10 requests, waiting each time for a response
for (let request = 0; request < 10; request++) {
    console.log("Sending request %d …", request);
    await socket.send("Hello");

    //  Get the reply.
    const [message] = await socket.receive();
    console.log("Received reply %d [ %s ]", request, message.toString());
}