import zmq from "zeromq";

const socket = new zmq.Subscriber();

console.log("Collecting updates from weather server...");
socket.connect("tcp://localhost:5556");

const zip_filter = process.argv[2] ? process.argv[2] : "10001";
socket.subscribe(zip_filter);

let total_temp = 0;
for (let update_nbr = 0; update_nbr < 20; update_nbr++) {
    const [string] = await socket.receive();
    const [zipcode, temperature, relhumidity] = string.toString().split(" ");
    total_temp += parseInt(temperature);
    console.log(`Receive temperature for zipcode '${zip_filter}' was ${temperature} F`);
}

console.log(`Average temperature for zipcode '${zip_filter}' was ${total_temp / 20} F`);