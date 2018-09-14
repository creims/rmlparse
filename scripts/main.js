import noteSet from './noteset.js';
import loadAudio from './loadaudio.js';
import rmlParse from './rmlparse.js';
import examples from './examples.js';

// Consts
const codeArea = document.getElementById('input');
const playBtn = document.getElementById('play');
const infoPane = document.getElementById('info');

const scheduleAheadTime = 0.1; // For reliable timing
const startOffset = 0.1; // Time after hitting play before playback starts

// Globals
let playing = false;
let startTime;
let timeElapsed = 0;
let noteSets;
let timer;
let audioCtx;
let audioBuffers;

function parse(code) {
	// Parse into notes
	const parsed = rmlParse(code, 0.3);
	
	// Display error if parsing failed
	if(parsed.type == 'error') {
		setInfo(parsed.errMsg());
		return;
	} 
	
	setInfo('Parse succeeded!');
	noteSets = parsed;
	
	// Assign audio buffers to notes
	for(let s of noteSets) {
		s.assignAudioBuffers(audioBuffers);
	}
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
	
	for(let set of noteSets) {
		set.reset();
	}
}
// Begin/resume playback
function play() {
	timer.postMessage('start');
	startTime = audioCtx.currentTime - timeElapsed;
	playBtn.textContent = 'Pause';
}

// Pause playback
function pause() {
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
	
	// Register document events
	document.getElementById('parse').onclick = () => { parse(codeArea.value) };
	
	playBtn.onclick = () => {
		playing = !playing;
		if(playing) {
			play();
		} else {
			pause();
		}
	};
	
	document.getElementById('reset').onclick = () => { resetPiece(); };
	
	// Set initial example
	codeArea.innerText = examples.beatrix;
};