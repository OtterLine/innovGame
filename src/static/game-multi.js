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

var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

Game = {
    fps: 60,
    isOver: false,
    player_uid: "me"
};




function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function Player(init_angle, div_id, uid, commands, direction=PLAYER_INIT_DIRECTION, jumping=false, jumping_progress=0) {
    this.parent_div = document.getElementById('container');
    this.div = document.createElement('div');
    this.div.id = uid;
    this.div.className = 'player';
    this.parent_div.appendChild(this.div);

    if (uid == 'me') {
        this.div.style.background = "#FF0000";
    }
//    this.div = document.getElementById(div_id);
//    this.scoreDiv = document.getElementById("sco-" + div_id);

    this.uid = uid;
    
    this.x = 0;
    this.y = 0;

    this.score = 0;

    this.angle = init_angle;// * Math.PI / 180;

    this.radius = PLAYER_INIT_RADIUS;
    this.angular_speed = PLAYER_INIT_SPEED;
    this.direction = direction;

    this.jumping = jumping;
    this.jumping_progress = jumping_progress;
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

//        this.scoreDiv.innerHTML = this.score
    }
}

function Food(container_div_id, ttl, radius, angle) {
    this.parent_div = document.getElementById(container_div_id);
    this.div = document.createElement('div');
    this.div.className = 'food';
    this.parent_div.appendChild(this.div);

    this.div.style.background = getRandomColor();

    this.ttl = ttl; //FOOD_TTL + Math.random() * 60;

    this.size = FOOD_SIZE;

    // Pop food, we need mean at middle of jump (thus init_radius + amplitude/4 and init_radius - amplitude/4)
    // and we need 3sigma the half of a jump (thus 3sigma = amplitude/4)
    this.radius = radius;//randn_bimodal(PLAYER_INIT_RADIUS + PLAYER_JUMPING_AMPLITUDE/4, PLAYER_JUMPING_AMPLITUDE/12, PLAYER_INIT_RADIUS - PLAYER_JUMPING_AMPLITUDE/4, PLAYER_JUMPING_AMPLITUDE/12);
    
    this.angle = angle;//Math.random() * 2 * Math.PI;

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
    
    this.players = [];
    this.foods = [];
    console.log('Adding me !');
    this.players.push(new Player(0.0, 'p1', 'me', commands_p1));

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
		    if(event.keyCode == key) {
			action.hold();
			socket.emit('action', {'type' : action_name});
		    }
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
	socket.emit('action', {'type' : 'flip'});
    });
    hammertime.on('swipeleft', function(ev) {
	Game.players[0].a['flip'].enable();
	socket.emit('action', {'type' : 'flip'});
    });
    hammertime.on('swipeup', function(ev) {
	Game.players[0].a['jump_up'].enable();
	socket.emit('action', {'type' : 'jump_up'});
    });
    hammertime.on('swipedown', function(ev) {
	console.log("SWIPEDOWN");
	Game.players[0].a["jump_down"].enable();
	socket.emit('action', {'type' : 'jump_down'});
    });
    window.addEventListener('keydown', this.listenerKeydown );
    window.addEventListener('keyup', this.listenerKeyup);
    
    
    socket.emit('looking_for_a_party', {});

    socket.on('party_found', function(msg) {
	// Setting angle
	Game.players[0].angle = msg.starting_angle;
	Game.players[0].uid = msg.uid;
	Game.player_uid = msg.uid;
	
	// Popping other players
	var players = msg.players;
	for (var pl in players) {
	    var commands = { "jump_up": {'keyboard' : []}, "jump_down": {'keyboard' : []}, "flip": {'keyboard' : []} };
	    console.log('Player : '+ JSON.stringify(players[pl]));
	    Game.players.push(new Player(players[pl].angle, '', players[pl].uid, commands, players[pl].direction, players[pl].jumping, players[pl].jumping_progress));
	}

	// Popping foods
	var foods = msg.foods;
	for (var food of foods) {
            Game.foods.push(new Food("container", food.ttl));
	}
    });

    socket.on('action', function(msg) {	
	if (msg.uid != Game.player_uid) { // Don't treat self bounced actions	    
	    if (msg.type == "join") { // Joining
		var commands = { "jump_up": {'keyboard' : []}, "jump_down": {'keyboard' : []}, "flip": {'keyboard' : []} };
		console.log('New player joining !');
		console.log('Angles : ' + JSON.stringify(Game.players));
		Game.players.push(new Player(msg.player.angle, '', msg.player.uid, commands, msg.player.direction, msg.player.jumping, msg.player.jumping_progress));
	    } else if (msg.type == "pop_food") { // Pop Food
		Game.foods.push(new Food("container", msg.food.ttl, msg.food.radius, msg.food.angle));				
	    } else { // Classic action
		for (var pl of Game.players) {
		    if (pl.uid == msg.uid) { // We find the good player
			pl.a[msg.type].enable();			
		    }
		}
	    }
	}
    });

};

Game.update = function () {
    for (i = 0; i < this.players.length; i++) {
        this.players[i].update();
    }

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
	for (i = 0; i < lenFood ; i++) {
	    this.players[i].div.remove();
	}

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
