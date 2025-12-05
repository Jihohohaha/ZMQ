import zmq from "zeromq";

async function serverWorker(id) {
    const worker = new zmq.Dealer();
    worker.connect("inproc://backend");
    console.log("Worker#%d started", id);
    while (true) {
        const [ident, msg] = await worker.receive();
        console.log("Worker#%d received %s from %s", id, msg.toString(), ident.toString());
        await worker.send([ident, msg]);
    }
}

async function serverTask(num_server) {
    const frontend = new zmq.Router();
    await frontend.bind("tcp://*:5570");

    const backend = new zmq.Dealer();
    await backend.bind("inproc://backend");

    const workers = [];
    for (let i = 0; i < num_server; i++) {
        workers.push(serverWorker(i));
    }

    const frontendToBackend = async () => {
        while (true) {
            const msg = await frontend.receive();
            await backend.send(msg);
        }
    };

    const backendToFrontend = async () => {
        while (true) {
            const msg = await backend.receive();
            await frontend.send(msg);
        }
    };

    await Promise.all([frontendToBackend(), backendToFrontend()]);
}

// usage: node lec-05-prg-09-dealer-router-async-server.mjs n
async function main(argv) {
    await serverTask(parseInt(argv[2]));
}

main(process.argv);