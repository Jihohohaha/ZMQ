import zmq from "zeromq";
import os from "os";
import dgram from "dgram";

function search_nameserver(ip_mask, local_ip_addr, port_nameserver) {
    return new Promise(async (resolve) => {
        const req = new zmq.Subscriber();
        for (let last = 1; last < 255; last++) {
            const target_ip_addr = `tcp://${ip_mask}.${last}:${port_nameserver}`;
            if (target_ip_addr !== local_ip_addr || target_ip_addr === local_ip_addr) {
                req.connect(target_ip_addr);
            }
            req.receiveTimeout = 2000;
            req.subscribe("NAMESERVER");
        }
        try {
            const [msg] = await req.receive();
            const res = msg.toString();
            const res_list = res.split(":");
            if (res_list[0] === "NAMESERVER") {
                resolve(res_list[1]);
            } else {
                resolve(null);
            }
        } catch (e) {
            resolve(null);
        }
    });
}

async function beacon_nameserver(local_ip_addr, port_nameserver) {
    const socket = new zmq.Publisher();
    await socket.bind(`tcp://${local_ip_addr}:${port_nameserver}`);
    console.log(`local p2p name server bind to tcp://${local_ip_addr}:${port_nameserver}.`);
    while (true) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const msg = `NAMESERVER:${local_ip_addr}`;
            await socket.send(msg);
        } catch (e) {
            break;
        }
    }
}

async function user_manager_nameserver(local_ip_addr, port_subscribe) {
    const user_db = [];
    const socket = new zmq.Reply();
    await socket.bind(`tcp://${local_ip_addr}:${port_subscribe}`);
    console.log(`local p2p db server activated at tcp://${local_ip_addr}:${port_subscribe}.`);
    while (true) {
        try {
            const [msg] = await socket.receive();
            const user_req = msg.toString().split(":");
            user_db.push(user_req);
            console.log(`user registration '${user_req[1]}' from '${user_req[0]}'.`);
            await socket.send("ok");
        } catch (e) {
            break;
        }
    }
}

async function relay_server_nameserver(local_ip_addr, port_chat_publisher, port_chat_collector) {
    const publisher = new zmq.Publisher();
    await publisher.bind(`tcp://${local_ip_addr}:${port_chat_publisher}`);
    const collector = new zmq.Pull();
    await collector.bind(`tcp://${local_ip_addr}:${port_chat_collector}`);
    console.log(`local p2p relay server activated at tcp://${local_ip_addr}:${port_chat_publisher} & ${port_chat_collector}.`);
    while (true) {
        try {
            const [msg] = await collector.receive();
            const message = msg.toString();
            console.log("p2p-relay:<==>", message);
            await publisher.send(`RELAY:${message}`);
        } catch (e) {
            break;
        }
    }
}

function get_local_ip() {
    return new Promise((resolve) => {
        const sock = dgram.createSocket("udp4");
        sock.connect(80, "8.8.8.8", () => {
            const address = sock.address().address;
            sock.close();
            resolve(address);
        });
        sock.on("error", () => {
            sock.close();
            resolve("127.0.0.1");
        });
    });
}

async function main(argv) {
    let ip_addr_p2p_server = "";
    const port_nameserver = 9011;
    const port_chat_publisher = 9012;
    const port_chat_collector = 9013;
    const port_subscribe = 9014;

    const user_name = argv[2];
    const ip_addr = await get_local_ip();
    const ip_mask = ip_addr.split(".").slice(0, 3).join(".");

    console.log("searching for p2p server.");

    const name_server_ip_addr = await search_nameserver(ip_mask, ip_addr, port_nameserver);
    if (name_server_ip_addr === null) {
        ip_addr_p2p_server = ip_addr;
        console.log("p2p server is not found, and p2p server mode is activated.");
        beacon_nameserver(ip_addr, port_nameserver);
        console.log("p2p beacon server is activated.");
        user_manager_nameserver(ip_addr, port_subscribe);
        console.log("p2p subsciber database server is activated.");
        relay_server_nameserver(ip_addr, port_chat_publisher, port_chat_collector);
        console.log("p2p message relay server is activated.");
    } else {
        ip_addr_p2p_server = name_server_ip_addr;
        console.log(`p2p server found at ${ip_addr_p2p_server}, and p2p client mode is activated.`);
    }

    console.log("starting user registration procedure.");

    const db_client_socket = new zmq.Request();
    db_client_socket.connect(`tcp://${ip_addr_p2p_server}:${port_subscribe}`);
    await db_client_socket.send(`${ip_addr}:${user_name}`);
    const [res] = await db_client_socket.receive();
    if (res.toString() === "ok") {
        console.log("user registration to p2p server completed.");
    } else {
        console.log("user registration to p2p server failed.");
    }

    console.log("starting message transfer procedure.");

    const p2p_rx = new zmq.Subscriber();
    p2p_rx.subscribe("RELAY");
    p2p_rx.connect(`tcp://${ip_addr_p2p_server}:${port_chat_publisher}`);
    const p2p_tx = new zmq.Push();
    p2p_tx.connect(`tcp://${ip_addr_p2p_server}:${port_chat_collector}`);

    console.log("starting autonomous message transmit and receive scenario.");

    let receivePromise = null;
    while (true) {
        if (receivePromise === null) {
            receivePromise = p2p_rx.receive();
        }

        const timeout = new Promise(resolve => setTimeout(() => resolve(null), 100));
        const result = await Promise.race([receivePromise, timeout]);

        if (result !== null) {
            const [msg] = result;
            const message = msg.toString();
            console.log(`p2p-recv::<<== ${message.split(":")[1]}:${message.split(":")[2]}`);
            receivePromise = null;
        } else {
            const rand = Math.floor(Math.random() * 100) + 1;
            if (rand < 10) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const msg = `(${user_name},${ip_addr}:ON)`;
                await p2p_tx.send(msg);
                console.log("p2p-send::==>>", msg);
            } else if (rand > 90) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const msg = `(${user_name},${ip_addr}:OFF)`;
                await p2p_tx.send(msg);
                console.log("p2p-send::==>>", msg);
            }
        }
    }
}

// usage: node lec-05-prg-12-p2p-dechat.mjs user_name
if (process.argv.length === 2) {
    console.log("usage is 'node lec-05-prg-12-p2p-dechat.mjs _user-name_'.");
} else {
    console.log("starting p2p chatting program.");
    main(process.argv);
}