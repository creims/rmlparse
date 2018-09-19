// Consts
const defaultWidth = 1040; // 52 white keys, 10pix each
const defaultHeight = 100;

const wFillColor = '#7A99D0';
const bFillColor = '#5651EC';

const bKeyPattern = [2, 1, 2, 1, 1];

// Helpers
// Converts an integer n to clock c (positive integer modulo math)
// Returns NaN if n or c are not both integers or if c is not > 0
function clock(n, c) {
	if(!Number.isInteger(n) || !Number.isInteger(c) || c < 1) {
		return NaN;
	}
	n = n % c;
	return n < 0 ? n + c : n;
}

// Constructor
function Keyboard(canvas) {
	this.canvas = canvas;
	this.ctx = canvas.getContext('2d');
	this.wPlaying = new Array(52).fill(false);
	this.bPlaying = new Array(36).fill(false);
	
	this.resize(defaultWidth, defaultHeight);
}

// Resize the keyboard
Keyboard.prototype.resize = function(width, height) {
	const wKeyWidth = defaultWidth / 52;
	const bKeyWidth = Math.floor(wKeyWidth * 0.4) * 2;
	const bKeyHeight = Math.floor(height * 0.6);
	
	this.wKeyCoords = new Array(52);
	this.bKeyCoords = new Array(36);
	
	// Resize canvas
	this.canvas.height = height;
	this.canvas.width = width;
	
	// Clear canvas
	this.ctx.clearRect(0, 0, width, height);
	
	// Calculate white key coordinates
	let x = 0;
	for(let i = 0; i < 52; i++) {
		this.wKeyCoords[i] = [x, 0, wKeyWidth, height];
		x += wKeyWidth;
	}
	
	// Calculate black key coordinates
	x = wKeyWidth - bKeyWidth / 2;
	for(let i = 0; i < 36; i++) { 
		this.bKeyCoords[i] = [x, 0, bKeyWidth, bKeyHeight];
		x += bKeyPattern[clock(i, 5)] * wKeyWidth;
	}
	
	// Redraw
	this.draw();
}

// Redraw the keyboard
Keyboard.prototype.draw = function() {
	// Clear the canvas
	this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
	
	// Draw white keys
	for(let i = 0; i < this.wKeyCoords.length; i++) {
		if(this.wPlaying[i]) { // Highlight key if currently playing
			this.ctx.fillStyle = wFillColor;
			this.ctx.fillRect(...this.wKeyCoords[i]);
		} else {
			this.ctx.clearRect(...this.wKeyCoords[i]);
		}
		
		this.ctx.strokeRect(...this.wKeyCoords[i]);
	}
	
	// Draw black keys
	for(let i = 0; i < this.bKeyCoords.length; i++) {
		if(this.bPlaying[i]) {
			this.ctx.fillStyle = bFillColor;
		} else {
			this.ctx.fillStyle = 'black';
		}
		
		this.ctx.fillRect(...this.bKeyCoords[i]);
		this.ctx.strokeRect(...this.bKeyCoords[i]);
	}
}

// Unpress all keys
Keyboard.prototype.clearNotes = function() {
	this.wPlaying.fill(false);
	this.bPlaying.fill(false);
}

// Press indicated keys
Keyboard.prototype.keysDown = function(notes) {
	this.setKeys(true, notes);
}

// Unpress indicated keys
Keyboard.prototype.keysUp = function(notes) {
	this.setKeys(false, notes);
}

// Set indicated keys to pressed/unpressed
Keyboard.prototype.setKeys = function(press, notes) {
	let octave;
	for(let n of notes) {
		octave = Math.floor(n / 12);
		
		switch(n % 12) {
			case 0:
				this.wPlaying[octave * 7] = press;
				break;
			case 1:
				this.bPlaying[octave * 5] = press;
				break;
			case 2:
				this.wPlaying[octave * 7 + 1] = press;
				break;
			case 3:
				this.wPlaying[octave * 7 + 2] = press;
				break;
			case 4:
				this.bPlaying[octave * 5 + 1] = press;
				break;
			case 5:
				this.wPlaying[octave * 7 + 3] = press;
				break;
			case 6:
				this.bPlaying[octave * 5 + 2] = press;
				break;
			case 7:
				this.wPlaying[octave * 7 + 4] = press;
				break;
			case 8:
				this.wPlaying[octave * 7 + 5] = press;
				break;
			case 9:
				this.bPlaying[octave * 5 + 3] = press;
				break;
			case 10:
				this.wPlaying[octave * 7 + 6] = press;
				break;
			case 11:
				this.bPlaying[octave * 5 + 4] = press;
				break;
		}
	}
}

export default Keyboard;