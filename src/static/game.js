// Touch gestures
var gameArea = document.getElementById('container');
var hammertime = new Hammer(gameArea);
hammertime.get('swipe').set({ direction: Hammer.DIRECTION_ALL });

// Configuration :
var PLAYER_INIT_SIZE = 10; // In PX
var PLAYER_INIT_RADIUS = 200;
var PLAYER_INIT_SPEED = 0.01;
var PLAYER_INIT_DIRECTION = 1; // Antitrigonometric
var PLAYER_GROWING_SPEED = -0.001; // In PX per frame

var PLAYER_JUMPING_SPEED = 1; // In perct per frame
var PLAYER_JUMPING_AMPLITUDE = 200; // In PX

var FOOD_POP_PROBABILITY = 0.95; // In prct/frame
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

// Standard Normal variate using Box-Muller transform.
function randn_bm(mean, sigma) {
    var u = 1 - Math.random(); // Subtraction to flip [0, 1) to (0, 1].
    var v = 1 - Math.random();
    var x = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return x*sigma+mean;
}

function randn_bimodal(mean_1, sigma_1, mean_2, sigma_2) {
    var u = Math.random();

    if(u > 0.5) {
	return randn_bm(mean_1, sigma_1);
    }
    return randn_bm(mean_2, sigma_2);
}


function Player(init_angle, div_id, commands) {
    this.div = document.getElementById(div_id);
    this.scoreDiv = document.getElementById("sco-" + div_id);

    this.x = 0;
    this.y = 0;

    this.score = 0;

    this.angle = init_angle * Math.PI / 180;

    this.radius = PLAYER_INIT_RADIUS;
    this.angular_speed = PLAYER_INIT_SPEED;
    this.direction = PLAYER_INIT_DIRECTION;
    this.direction_holded = false;

    this.jumping = false;
    this.jumping_progress = 0;
    this.jumping_speed = PLAYER_JUMPING_SPEED;
    this.jumping_amplitude = PLAYER_JUMPING_AMPLITUDE;

    this.size = PLAYER_INIT_SIZE;
    this.div.clientHeight = this.size;

    this.a = {};
    for (var name in commands) {
	this.a[name] = new Action(commands[name]);
    }

    this.hasWon = false;

    this.update = function () {
        if (this.a['flip'].getOnce())
	    this.direction *= -1;

        if (this.size > PLAYER_INIT_SIZE) this.size += PLAYER_GROWING_SPEED;

	var jump_down = this.a['jump_down'].get();
	var jump_up = this.a['jump_up'].get();
        if ((jump_down  || jump_up) && !this.jumping) {
            this.jumping = true;
	    
            if (jump_down)
		this.jumping_amplitude = -PLAYER_JUMPING_AMPLITUDE/2;
            else
		this.jumping_amplitude = PLAYER_JUMPING_AMPLITUDE/2;
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
        this.score += 1;
        this.size += 2;
        this.speed -= 0.01;
    };


    this.draw = function () {
        this.div.style.top = this.y + "px";
        this.div.style.left = this.x + "px";
        this.div.style.height = this.size + "px";
        this.div.style.width = this.size + "px";

        this.scoreDiv.innerHTML = this.score
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

    // Pop food, we need mean at middle of jump (thus init_radius + amplitude/4 and init_radius - amplitude/4)
    // and we need 3sigma the half of a jump (thus 3sigma = amplitude/4)
    this.radius = randn_bimodal(PLAYER_INIT_RADIUS + PLAYER_JUMPING_AMPLITUDE/4, PLAYER_JUMPING_AMPLITUDE/12, PLAYER_INIT_RADIUS - PLAYER_JUMPING_AMPLITUDE/4, PLAYER_JUMPING_AMPLITUDE/12);
    
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

function Action(commands) {
    this.commands = commands;
    
    this.state = false;
    this.holded = false;
    
    this.hold = function () {
	if (!this.holded) {
	    this.holded = true;
	    this.state = true;
	}
    };

    this.disable = function () {
	this.holded = false;
	this.state = false;
    };

    this.enable = function () {
	this.state = true;
    };

    this.get = function () {
	var actual_state = this.state;
	if (!this.holded) {
	    this.state = false;
	}
	return actual_state;
    };

    this.getOnce = function () {
	var actual_state = this.state;
	// Don't set holded to false in order to know we read once.
	this.state = false;

	return actual_state;
    };
}



var Key = {
    A: 65,
    Q: 81,
    S: 83,
    K: 75,
    O: 79,
    L: 76,
    SPC: 32
};

Game.init = function () {
    // Context init :
    Game.container = document.getElementById("container");
    Game.w = Game.container.clientWidth;
    Game.h = Game.container.clientHeight;

    Game.reset();
};

Game.reset = function () {

    // TODO : Customize this with a "commands" menu
    var commands_p1 = {
	"jump_up": {
	    'keyboard' : [Key.A],
	    'touchscreen' : [] // Future
	},
	"jump_down": {
	    'keyboard' : [Key.Q],
	    'touchscreen' : [] // Future
	},
	"flip": {
	    'keyboard' : [Key.S],
	    'touchscreen' : [] // Future
	}
    };
    var commands_p2 = {	"jump_up": { 'keyboard' : [Key.O], 'touchscreen' : [] }, "jump_down": { 'keyboard' : [Key.L], 'touchscreen' : [] }, "flip": { 'keyboard' : [Key.K], 'touchscreen' : [] } };
    
    this.players = [];
    this.players.push(new Player(0.0, 'p1', commands_p1));
    this.players.push(new Player(180.0, 'p2', commands_p2));


    // Remove old listeners
    window.addEventListener('keydown', this.listenerKeydown );
    window.addEventListener('keydown', this.listenerKeyup );

    // Gather all players' action's commands and make one listener
    // Add keyboard listeners for Actions
    this.listenerKeydown = function (event) {
	for (var player of Game.players) {
	    for (var action_name in player.a) {
		var action = player.a[action_name];
		for (var key of action.commands['keyboard']) {
		    if(event.keyCode == key)
			action.hold();		    
		}
	    }
	}
    };
    this.listenerKeyup = function (event) {
	for (var player of Game.players) {
	    for (var action_name in player.a) {
		var action = player.a[action_name];
		for (var key of action.commands['keyboard']) {
		    if(event.keyCode == key)
			action.disable();		    
		}
	    }
	}
    }
    hammertime.on('swiperight', function(ev) {
	Game.players[0].a['flip'].enable();
    });
    hammertime.on('swipeleft', function(ev) {
	Game.players[0].a['flip'].enable();
    });
    hammertime.on('swipeup', function(ev) {
	Game.players[0].a['jump_up'].enable();
    });
    hammertime.on('swipedown', function(ev) {
	console.log("SWIPEDOWN");
	Game.players[0].a["jump_down"].enable();
    });

    window.addEventListener('keydown', this.listenerKeydown );
    window.addEventListener('keyup', this.listenerKeyup);
    // Future listeners for Touch event
    

    // Start some initial food
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
    if (Math.random() > FOOD_POP_PROBABILITY)
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
	var lenPlayer = this.players.length;
	var lenFood = this.foods.length;
	for (i = 0; i < lenFood ; i++) {
	    this.foods[i].div.remove();
	}
	this.isOver = false;
        //clearInterval(Game._intervalId);
        Game.reset();
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


// Start game
Game.init();
Game._intervalId = setInterval(Game.run, 1000 / Game.fps);
