const express = require('express');
const app = express();
const http = require('http');
const socketServer = require("socket.io");
const httpServer = http.createServer(app);
const io = socketServer(httpServer, {
    cors: {
        origin: "http://localhost:3000",
    },
});

const TICK = 1000 / 24;
const PORT = process.env.PORT || 3000;
// let connections = new Map();

const CONNECTION_TYPE = {
    interfaces: 'interfaces',
    displays: 'displays',
    admins: 'admins',
}

const NUM_INTERFACES = 100;
const STEP_SIZE = 0.01;
const PLAY_CHANCE = 0.01;
const STOP_CHANCE = 0.01;
const SHOULD_SIMULATE = true;
const TOUCH = {
    PressStart: 'PressStart',
    PressHeld: 'PressHeld',
    PressEnd: 'PressEnd',
};

class SimulatedPlayer {
    constructor(id) {
        this.isPlaying = false;
        this.id = id;
        this._u = Math.random();
        this._v = Math.random();
    }

    simulate() {
        if (this.isPlaying) {
            // random walk around canvas
            this._u += (2 * Math.random() - 1) * STEP_SIZE;
            this._v += (2 * Math.random() - 1) * STEP_SIZE;
            this._u = Math.min(Math.max(0, this._u), 1);
            this._v = Math.min(Math.max(0, this._v), 1);
            if (STOP_CHANCE > Math.random()) {
                this.isPlaying = false;
                return {
                    u: this._u,
                    v: this._v,
                    touch: TOUCH.PressEnd,
                };
            } else {
                return {
                    u: this._u,
                    v: this._v,
                    touch: TOUCH.PressHeld,
                };
            }
        } else {
            if (PLAY_CHANCE > Math.random()) {
                this.isPlaying = true;
                return {
                    u: this._u,
                    v: this._v,
                    touch: TOUCH.PressStart,
                };
            } else {
                return null;
            }
        }
    }

    get data() {

    }
}

class Simulator {
    constructor(manager) {
        this._manager = manager;
        this._players = [];
        for (let i = 0; i < NUM_INTERFACES; i++) {
            const id = Math.floor(Math.random() * 12345432);
            this._manager.addConnection({id: id}, CONNECTION_TYPE.interfaces);
            this._players.push(new SimulatedPlayer(id));
        }
    }

    simulate() {
        for (let i = 0; i < this._players.length; i++) {
            const player = this._players[i];
            const data = player.simulate();
            if (data != null) {
                this._manager.enqueueData(player.id, data);
            }
        }
    }
}

class ConnectionManager {
    constructor() {
        this._connections = {}
        this._connections[CONNECTION_TYPE.interfaces] = [];
        this._connections[CONNECTION_TYPE.displays] = [];
        this._connections[CONNECTION_TYPE.admins] = [];
        this._enqueuedData = [];
    }

    addConnection(socket, type) {
        this._connections[type].push(socket.id);
        if (type == CONNECTION_TYPE.interfaces) {
            io.of('/display').emit('add-interface', socket.id);
        } else if (type == CONNECTION_TYPE.displays) {
            const interfaces = this._connections[CONNECTION_TYPE.interfaces];
            for (let id of interfaces) {
                io.of('/display').emit('add-interface', id);
            }
        }
    }

    removeConnection(socket, type) {
        if (type == CONNECTION_TYPE.interfaces) {
            io.of('/display').emit('remove-interface', socket.id);
        }
        delete this._connections[type][socket.id];
    }

    enqueueData(id, data) {
        this._enqueuedData.push({
            id: id,
            data:data
        });
    }

    sendDataToDisplays() {
        io.of('/display').emit('incoming-data', this._enqueuedData);
        this._enqueuedData.length = 0;
    }
}

const manager = new ConnectionManager();
const simulator = new Simulator(manager);

app.set('port', PORT);

app.get('/display', function (req, res) {
    res.sendFile(__dirname + '/public/display/index.html');
});

app.get('/interface', function (req, res) {
    res.sendFile(__dirname + '/public/interface/index.html');
});

app.get('/admin', function (req, res) {
    res.sendFile(__dirname + '/public/admin/index.html');
});

app.use(express.static('public'));

io.of('/display').on('connection', (socket) => {
    console.log(socket.id + ' display connected');
    const type = CONNECTION_TYPE.displays;
    manager.addConnection(socket, type);

    socket.on('disconnect', () => {
        console.log(socket.id + ' display disconnected');
        manager.removeConnection(socket, type)
    });
});

io.of('/interface').on('connection', (socket) => {
    console.log(socket.id + ' interface connected');
    const type = CONNECTION_TYPE.interfaces;
    manager.addConnection(socket, type);

    socket.on('action', (data) => { 
        manager.enqueueData(socket.id, data);
    });

    socket.on('disconnect', () => {
        console.log(socket.id + ' interface disconnected');
        manager.removeConnection(socket, type)
    });
});

io.of('/admin').on('connection', (socket) => {
    console.log(socket.id + ' admin connected');
    const type = CONNECTION_TYPE.admins;
    manager.addConnection(socket, type);

    socket.on('disconnect', () => {
        console.log(socket.id + ' admin disconnected');
        manager.removeConnection(socket, type)
    });
});

httpServer.listen(PORT, () => {
    console.log('listening on :' + PORT);
});

setInterval(() => {
    if (SHOULD_SIMULATE) {
        simulator.simulate();
    }
    manager.sendDataToDisplays();
}, TICK);
  