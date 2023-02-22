
class Cursor {
    constructor(socketId) {
        
    }

    draw() {
        if (this._x == null) {
            this._x = mouseX;
            this._y = mouseY;
        } else {
            this._x = lerp(this._x, mouseX, 0.5);
            this._y = lerp(this._y, mouseY, 0.5);
        }
        circle(this._x, this._y, 20);
    }
}

class PlayerCanvas {
    constructor(c0, c1) {
        this.pressed = false;
        this._c0 = c0;
        this._c1 = c1;
        this._socket = io("/interface");
        this._cursor = new Cursor(this._socket.id);
    }

    resize(w, h) {
        this._width = w;
        this._height = h;
    }

    setTransform(x, y, w, h) {
        this._x0 = x;
        this._x1 = x + w;
        this._y0 = y;
        this._y0 = y + h;
        this._width = w;
        this._height = h;
    }

    inBounds(x, y) {
        if (x > this._x0 && x < this._x0 + this._width && y > this._y0 && y < this._y0 + this._height) {
            return true;
        } else {
            return false;
        }
    }

    getUv(x, y) {
        return {
            u: 1 - (x - this._x0) / this._width, 
            v: 1 - (y - this._y0) / this._height,
        };
    }

    onMousePressed() {
        const uv = this.getUv(mouseX, mouseY);
        if(uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1) {
            this.sendTouch(uv, TOUCH.PressStart);
            this.pressed = true;
        }
    }

    onMouseHeld() {
        const uv = this.getUv(mouseX, mouseY);
        if(this.pressed && uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1) {
            this.sendTouch(uv, TOUCH.PressHeld);
        }
    }

    onMouseReleased() {
        const uv = this.getUv(mouseX, mouseY);
        if(uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1) {
            this.sendTouch(uv, TOUCH.PressEnd);
            this.pressed = false;
        }
    }

    sendTouch(uv, type) {
        this._socket.emit('action', {
            u: uv.u,
            v: uv.v,
            touch: type
        });
    }

    get mouseX() {

    }

    init() {
        rect(this._x0, this._y0, this._width, this._height, 5);
    }

    draw() {
        colorMode(RGB, 255);
        rect(this._x0, this._y0, this._width, this._height, 5);
        // fill(this._c0);
        stroke(this._c1);
        if (this.pressed) {
            this._cursor.draw();
        }
    }
}

const gridElements = [];

function setTransforms(rowNum, colNum, gapPercentW, gapPercentH) {
    const gapWidth = windowWidth / gapPercentW;
    const gapHeight = windowHeight / gapPercentH;
    const buttonWidth = windowWidth / colNum - gapWidth - gapWidth / colNum;
    const buttonHeight = windowHeight / rowNum - gapHeight - gapHeight / rowNum;
    for (let i = 0; i < rowNum; i++) {
        for (let j = 0; j < colNum; j++) {
            let idx = i * colNum + j;
            let x = gapWidth + j * buttonWidth + gapWidth * (j);
            let y = gapHeight + (i - 1) * buttonHeight + gapHeight * (i);
            gridElements[idx].setTransform(x, y, buttonWidth, buttonHeight);
        }
    }
}

let pressed = false;

function setup() {
    createCanvas(windowWidth, windowHeight);

    const c0 = color(200, 200, 200);
    const c1 = color(100, 100, 100);
    gridElements.push(new PlayerCanvas(c0, c1));
    setTransforms(1, 1, 1, 1);

}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function draw() {
    for (let gridElement of gridElements) {
        gridElement.draw();
    }
    if (pressed) {
        for (let gridElement of gridElements) {
            gridElement.onMouseHeld();
        }
    }
}

function mousePressed() {
    console.log('pressed: ', mouseX, mouseY);
    for (let gridElement of gridElements) {
        gridElement.onMousePressed();
    }
    pressed = true;
}

function mouseReleased() {
    console.log('released: ', mouseX, mouseY);
    for (let gridElement of gridElements) {
        gridElement.onMouseReleased();
    }
    pressed = false;
}