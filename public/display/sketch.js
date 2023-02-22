const delaySettings = {
    delayTime: 0.3,
    maxDelay: 2,
    wet: 0.3,
    feedback: 0.1,
};

const SHAPE_TYPE = {
    Circle: 'Circle',
    Rect: 'Rect',
}

const delay = new Tone.FeedbackDelay(delaySettings);

class Player {
    constructor(id) {
        this.id = id;
        const hash = cyrb128(id + "");
        this._random = sfc32(hash[0], hash[1], hash[2], hash[3]);
        this._x = 0;
        this._y = 0;
        this._generateSettings();
        this._synth = new Tone.MonoSynth(this._settings);// new Tone.FatOscillator(synthSettings);
        this._panner = new Tone.Panner3D(this._x, this._y, -2);
        // this._synth.chain(/* this._volume, this._delay,*/ this._panner, delay);
        this._synth.chain(/* this._volume, this._delay,*/ this._panner, Tone.Master);
        // delay.chain(Tone.Master)
        this._color0 = color(this._random() * 125 + 130, this._random() * 125 + 130, this._random() * 125 + 130);
        this._color1 = color(this._random() * 125 + 130, this._random() * 125 + 130, this._random() * 125 + 130);
    }

    receiveData(data) {
        if (data.touch == TOUCH.PressStart) {
            this._x = data.u * windowWidth;
            this._y = data.v * windowHeight;
            this._pressed = true;
            this._synth.triggerAttack(this._getNote()); // move later
        } else if (data.touch == TOUCH.PressHeld) {
            this._x = data.u * windowWidth;
            this._y = data.v * windowHeight;
        } else if (data.touch == TOUCH.PressEnd) {
            this._x = data.u * windowWidth;
            this._y = data.v * windowHeight;
            this._pressed = false;
            this._synth.triggerRelease(); // move later
        }
        this._panner.positionX = -(data.u * 2 - 1) * 2;
        this._panner.positionY = (data.v * 2 - 1);
        this._freq = 0.1;
        this._offset = this._random() * 10;
        this._shapeType = SHAPE_TYPE.Circle;
    }

    get _wave() {
        return Math.sin(frameCount * this._freq + this._offset);
    }

    draw() {
        if (this._pressed) {
            const w = this._wave;
            if (this._shapeType == SHAPE_TYPE.Circle) {
                const colorResult = lerpColor(this._color0, this._color1, w);
                fill(colorResult);
                noStroke();
                circle(this._x, this._y, 20 + 7 * w);
            } 
        }
    }

    _getNote() {
        const choices0 = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const choices1 = ['3', '4', '5'];
        const choice0 = choices0[Math.floor(this._random() * choices0.length)];
        const choice1 = choices1[Math.floor(this._random() * choices1.length)];
        return choice0 + choice1;
    }

    _getShape() {
        const choices = ['triangle', 'sine', 'sawtooth', 'square'];
        return choices[Math.floor(this._random() * choices.length)];
    }

    _generateSettings() {
        this._settings = {
            volume: -40,
            // frequency: 'C4',
            frequency: this._getNote(),
            detune: 200,
            oscillator: {
                type: this._getShape()
            },
            filter: {
                Q: 1,
                type: 'lowpass',
                rolloff: -12,
            },
            envelope: {
                attack: 0.25,
                decay: 0.5,
                sustain: 0.3,
                release: 2.3,
            },
            filterEnvelope: {
                attack: 0.1,
                decay: 1,
                sustain: 1,
                release: 0.5,
                baseFrequency: 30000,
                octaves: 7,
                exponent: 3,
            },
        };
    }
}

class PlayerManager {
    constructor() {
        this._players = {};
        this._socket = io("/display");;
        this._socket.on("add-interface", (id) => {
            console.log("player added: " + id);
            if (this._players[id] == null)
                this._players[id] = new Player(id);
        });
        this._socket.on("remove-interface", (id) => {
            delete this._players[id];
            console.log("player removed: " + id);
        });
        this._socket.on("incoming-data", (data) => {
            for (let datum of data) {
                if (datum.id in this._players) {
                    this._players[datum.id].receiveData(datum.data);
                }
            }
        });
    }

    draw() {
        const players = Object.values(this._players);
        for (let player of players) {
            player.draw();
        }
    }
}

document.querySelector('button')?.addEventListener('click', async () => {
	console.log('audio is ready');
});

function preventBehavior(e) {
    e.preventDefault(); 
};

document.addEventListener("touchmove", preventBehavior, {passive: false});

function setup() {
    background(220);
    createCanvas(windowWidth, windowHeight);
    manager = new PlayerManager();
    noCursor();
}

function draw() {
    manager.draw();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

async function mousePressed() {
    if (mouseX > 0 && mouseX < windowWidth && mouseY > 0 && mouseY < windowHeight) {
        let fs = fullscreen();
        fullscreen(!fs);
    }
}