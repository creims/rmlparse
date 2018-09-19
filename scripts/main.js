import noteSet from './noteset.js';
import loadAudio from './loadaudio.js';
import rmlParse from './rmlparse.js';
import examples from './examples.js';
import Keyboard from './keyboard.js';

// Consts
const codeArea = document.getElementById('input');
const playBtn = document.getElementById('play');
const infoPane = document.getElementById('info');
const exampleDiv = document.getElementById('examples');

const scheduleAheadTime = 0.15; // For reliable timing
const startOffset = 0.1; // Time after hitting play before playback starts

// Globals
let playing = false;
let startTime;
let timeElapsed = 0;
let noteSets;
let timer;
let audioCtx;
let audioBuffers;
let keyboard;
let scheduledNotes = [];

// Parse RML into note sets and assign audio buffers
// Returns true if the parse succeeds, false otherwise
function parse(code) {
	// Parse into notes
	const parsed = rmlParse(code);
	
	// Display error if parsing failed
	if(parsed.type == 'error') {
		setInfo(parsed.errMsg());
		return false;
	} 
	
	setInfo('Parse succeeded!');
	noteSets = parsed;
	
	// Assign audio buffers to notes
	for(let s of noteSets) {
		s.assignAudioBuffers(audioBuffers);
	}
	
	return true;
}

// Schedule a particular note
function scheduleNote(n) {
	const node = audioCtx.createBufferSource();
	node.buffer = n.buffer;
	
	if(n.volume < 1) {
		const gain = audioCtx.createGain();
		gain.gain.value = n.volume;
		node.connect(gain);
		gain.connect(audioCtx.destination);
	} else {
		node.connect(audioCtx.destination);
	}
	
	const adjustedTime = startTime + n.time;
	node.start(adjustedTime);
	node.stop(adjustedTime + n.duration);
	
	// Add to scheduled notes for visualization
	scheduledNotes.push({
		start: adjustedTime,
		stop: adjustedTime + n.schedDur,
		note: n.noteCode
	});
}

function scheduleNotes() {
	let done = true;
	// Schedule notes from each set
	for(let set of noteSets) {
		// Schedule notes up to scheduleAheadTime from now
		if(set.hasMoreNotes()) {
			done = false;
		}
		
		while(set.hasMoreNotes() 
			&& set.nextNoteTime() + startTime < audioCtx.currentTime + scheduleAheadTime) {
			scheduleNote(set.nextNote());
		}
	}
	
	// If there are no more notes to schedule in any note set,
	// reset the piece
	if(done) {
		resetPiece();
	}
}

// Reset the current song
function resetPiece() {
	timeElapsed = 0;
	stopTimer();
	playing = false;
	scheduledNotes = [];
	
	for(let set of noteSets) {
		set.reset();
	}
}

// Update keyboard visualization
function animate() {
	if(playing || scheduledNotes.length > 0) {
		let draw = false; // Only draw if needed
		let endedNotes = []; // Notes done playing since last draw
		let newNotes = []; // Notes that began playing since last draw
		
		// Update status of all scheduled notes
		for(let i = 0; i < scheduledNotes.length; /* Increment conditionally later */) {
			const n = scheduledNotes[i];
			
			// If the note has ended, remove the note from the schedule
			if(n.stop < audioCtx.currentTime) {
				scheduledNotes.splice(i, 1);
				endedNotes.push(n.note);
				draw = true;
				continue;
			}
			
			// If the note had not yet started playing last frame
			if(n.start <= audioCtx.currentTime) {
				newNotes.push(n.note);
				draw = true;
			}
			
			i++; // Increment i since we didn't remove an element from scheduledNotes
		}
		
		// If things changed, redraw the keyboard
		if(draw) {
			// Order is important - a key IS supposed to be pressed if it is both
			// newly ended and newly pressed
			keyboard.keysUp(endedNotes);
			keyboard.keysDown(newNotes);
			keyboard.draw();
		}
		
		// Loop since we're (probably) still playing
		requestAnimationFrame(animate);
	} else {
		// No longer playing, clear notes and don't loop
		keyboard.clearNotes();
		keyboard.draw();
	}
}

// Begin/resume playback
function play() {
	playing = true;
	timer.postMessage('start');
	startTime = audioCtx.currentTime - timeElapsed;
	playBtn.textContent = 'Pause';
	requestAnimationFrame(animate);
}

// Pause playback
function pause() {
	playing = false;
	// Store the time passed in the track so we can resume properly
	timeElapsed = audioCtx.currentTime - startTime;
	stopTimer();
}

function stopTimer() {
	timer.postMessage('stop');
	playBtn.textContent = 'Play';
}

function setInfo(str) {
	infoPane.innerText = str;
}

function makeExampleButton(name) {
	const btn = document.createElement('button');
	btn.innerText = 'Load ' + name;
	exampleDiv.appendChild(btn);
	return btn;
}

window.onload = function(){
	// Initialize audio context
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	audioCtx = new AudioContext();
	
	// Load audio
	const noteNames = ['A', 'BB', 'B', 'C', 'DB', 'D', 'EB', 'E', 'F', 'GB', 'G', 'AB'];
	let urls = [];
	for(let i = 0; i < 88; i++) {
		// ((i + 9) / 12) >> 0 gives the octave (integer division with an offset)
		urls.push("./sounds/PIANO_LOUD_" + noteNames[i % 12] + (((i + 9) / 12) >> 0) + ".m4a");
	}
	
	loadAudio(audioCtx, urls, bufs => {
		audioBuffers = bufs;
		setInfo('Loading complete!');
	});
	
	// Initialize timer that schedules notes (for consistent scheduling)
	timer = new Worker('scripts/worker.js');
	timer.onmessage = () => { scheduleNotes(); };
	
	// Initialize visuals
	keyboard = new Keyboard(document.getElementById('keyboard'));
	
	// Register document events
	document.getElementById('parse').onclick = () => {
		if(playing) {
			pause();
		}
		
		if(parse(codeArea.value)) {
			resetPiece();
		}
	};
	
	playBtn.onclick = () => {
		if(playing) {
			pause();
		} else {
			play();
		}
	};
	
	document.getElementById('reset').onclick = () => { resetPiece(); };
	
	// Allow saving code
	let saved = '';	
	const saveBtn = makeExampleButton('Saved').onclick = () => {
		codeArea.value = saved;
		setInfo('Loaded code.');
	};
	
	// Add example load buttons
	for(let [name, exampleText] of Object.entries(examples)) {
		makeExampleButton(name).onclick = () => {
			saved = codeArea.value;
			codeArea.value = exampleText;
			setInfo('Saved code.');
		};
	}
	
	codeArea.value = examples.Beatrix;
};