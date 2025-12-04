import zmq from "zeromq";

function randrange(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

// Added from the original code
console.log("Publishing updates at weather server...");

const socket = new zmq.Publisher();
await socket.bind("tcp://*:5556");

while (true) {
    const zipcode = randrange(1, 100000);
    const temperature = randrange(-80, 135);
    const relhumidity = randrange(10, 60);

    await socket.send(`${zipcode} ${temperature} ${relhumidity}`);
}