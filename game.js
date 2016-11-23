// Configuration :
var PLAYER_INIT_SIZE = 10; // In PX
var PLAYER_INIT_RADIUS = 200;
var PLAYER_INIT_SPEED = 0.01;
var PLAYER_INIT_DIRECTION = 1; // Antitrigonometric
var PLAYER_GROWING_SPEED = -0.001; // In PX per frame

var PLAYER_JUMPING_SPEED = 1; // In perct per frame
var PLAYER_JUMPING_AMPLITUDE = 100; // In PX

var FOOD_SIZE = 8; // In PX
var FOOD_TTL = 60 * 3; // In Frame

Game = {
    fps: 60,
    isOver: false
};

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function Player(init_angle, div_id, up_key, down_key, flip_key) {
    this.div = document.getElementById(div_id);

    this.x = 0;
    this.y = 0;

    this.angle = init_angle * Math.PI / 180;

    this.radius = PLAYER_INIT_RADIUS;
    this.angular_speed = PLAYER_INIT_SPEED;
    this.direction = PLAYER_INIT_DIRECTION;
    this.direction_holded = false;

    this.jumping = false;
    this.jumping_progress = 0;
    this.jumping_speed = PLAYER_JUMPING_SPEED;
    this.jumping_amplitude = PLAYER_JUMPING_AMPLITUDE;

    this.size = this.div.clientHeight;

    this.up_key = up_key;
    this.down_key = down_key;
    this.flip_key = flip_key;

    this.hasWon = false;

    this.update = function () {
        if (Key.isDown_triggerOnce(this.flip_key)) this.direction *= -1;

        if (this.size > PLAYER_INIT_SIZE) this.size += PLAYER_GROWING_SPEED;

        if ((Key.isDown(this.up_key) || Key.isDown(this.down_key)) && !this.jumping) {
            this.jumping = true;
            if (Key.isDown(this.down_key))    this.jumping_amplitude = -PLAYER_JUMPING_AMPLITUDE ;
            else this.jumping_amplitude = PLAYER_JUMPING_AMPLITUDE;
        }

        if (this.jumping) {
	    // First, update jumping amplitude
	    // Check if we ended the jump, if then, reset jump variables
            if (this.jumping_progress == 100) {
                this.radius = PLAYER_INIT_RADIUS; // Just to be sure
                this.jumping = false;
                this.jumping_progress = 0;
            } else {
		// Else, progress in speed, set new radisu as initial radius plus the sinus of the progress in radians times the amplitude.
		this.jumping_progress += this.jumping_speed;
		this.radius = PLAYER_INIT_RADIUS + this.jumping_amplitude*Math.sin(Math.PI*this.jumping_progress/100.0);
	    }
        }

        for (j = 0; j < Game.players.length; j++) {
            if (Game.players[j] == this) {
                continue;
            }

            if (Game.players[j].size >= this.size) {
                continue;
            }
            // Gather some coordinates
            x_p = Game.players[j].x;
            y_p = Game.players[j].y;
            r_p = Game.players[j].size / 2;
            r_f = this.size / 2;

            if ((Math.abs(x_p + r_p - this.x - r_f) < r_p) && (Math.abs(y_p + r_p - this.y - r_f) < r_p)) {
                // Players eat the food
                this.hasWon = true;
                Game.isOver = true;
            }
        }

        this.angle += this.direction * this.angular_speed;

        this.x = this.radius * Math.cos(this.angle) + Game.w / 2 - this.size / 2;
        this.y = this.radius * Math.sin(this.angle) + Game.h / 2 - this.size / 2;

    };

    this.eat = function () {
        this.size += 2;
        this.speed -= 0.01;
    };


    this.draw = function () {
        this.div.style.top = this.y + "px";
        this.div.style.left = this.x + "px";
        this.div.style.height = this.size + "px";
        this.div.style.width = this.size + "px";
    }
}

function Food(container_div_id) {
    this.parent_div = document.getElementById(container_div_id);
    this.div = document.createElement('div');
    this.div.className = 'food';
    this.parent_div.appendChild(this.div);

    this.div.style.background = getRandomColor();

    this.ttl = FOOD_TTL + Math.random() * 60;

    this.size = FOOD_SIZE;

    radius_random = (Math.random() - 0.5)*2; // Let's deduce the position from it
    if (radius_random < 0) {
	this.radius = PLAYER_INIT_RADIUS - radius_random * PLAYER_JUMPING_AMPLITUDE/2;
    } else {
	this.radius = PLAYER_INIT_RADIUS + radius_random * PLAYER_JUMPING_AMPLITUDE/2;
    }
    
    this.angle = Math.random() * 2 * Math.PI;

    this.x = this.radius * Math.cos(this.angle) + Game.w / 2 - this.size / 2;
    this.y = this.radius * Math.sin(this.angle) + Game.h / 2 - this.size / 2;

    this.div.style.top = this.y + "px";
    this.div.style.left = this.x + "px";

    this.update = function () {
        // Check if some users has reached the ball
        for (j = 0; j < Game.players.length; j++) {
            // Gather some coordinates :
            x_p = Game.players[j].x;
            y_p = Game.players[j].y;
            r_p = Game.players[j].size / 2;
            r_f = this.size / 2;

            if ((Math.abs(x_p + r_p - this.x - r_f) < r_p) && (Math.abs(y_p + r_p - this.y - r_f) < r_p)) {
                // Players eat the food
                Game.players[j].eat();
                this.div.remove();
                return 1;
            }
        }
        if (--this.ttl <= 0) {
            this.div.remove();
            return 1;
        }
        this.div.style.opacity = this.ttl / FOOD_TTL;
        return 0;
    }
}

var Key = {
    _pressed: {},

    A: 65,
    Q: 81,
    S: 83,
    K: 75,
    O: 79,
    L: 76,
    SPC: 32,

    isDown: function (keyCode) {
        return this._pressed[keyCode];
    },

    isDown_triggerOnce: function (keyCode) {
        if (this._pressed[keyCode]) {
            delete this._pressed[keyCode];
            return 1;
        }
        return 0;
    },

    onKeydown: function (event) {
        this._pressed[event.keyCode] = true;
    },

    onKeyup: function (event) {
        delete this._pressed[event.keyCode];
    }
};

Game.init = function () {
    // Context init :
    Game.container = document.getElementById("container");
    Game.w = Game.container.clientWidth;
    Game.h = Game.container.clientHeight;

    Game.reset();
};

Game.reset = function () {
    this.players = [];
    this.players.push(new Player(0.0, 'p1', Key.A, Key.Q, Key.S));
    this.players.push(new Player(180.0, 'p2', Key.O, Key.L, Key.K));

    this.foods = [];
    for (i = 0; i < 10; i++) {
        this.foods.push(new Food("container"));
    }
};

Game.update = function () {
    for (i = 0; i < this.players.length; i++) {
        this.players[i].update();
    }

    // Pop food
    if (Math.random() > 0.95)
        this.foods.push(new Food("container"));

    for (i = 0; i < this.foods.length; i++) {
        if (this.foods[i].update()) {
            this.foods.splice(i, 1);
            i--;
        }
    }

    // Game over
    if (this.isOver) {
        for (i = 0; i < this.players.length; i++){
            if (this.players[i].hasWon) {
                console.log("Player " + (i + 1) +" Wins");
                alert("Player " + (i + 1) +" Wins");
                break
            }
        }
        clearInterval(Game._intervalId);
       // Game.reset();
    }
};

Game.draw = function () {
    for (i = 0; i < this.players.length; i++) {
        this.players[i].draw();
    }
};

Game.run = function () {
    Game.update();
    Game.draw();
};

// Create keypress listeners
window.addEventListener('keyup', function (event) {
    Key.onKeyup(event);
}, false);
window.addEventListener('keydown', function (event) {
    Key.onKeydown(event);
}, false);

// Start game
Game.init();
Game._intervalId = setInterval(Game.run, 1000 / Game.fps);
