import noteSet from './noteset.js';

const defaultBaseNote = 48; // 48th note on keyboard, A4
const defaultDuration = 1; // 60BPM

// Token type factories
// A note to be played
// code corresponds to relative pitch (chromatic distance from root note)
function note(code, length) {
	return {
		type: 'note',
		code,
		length
	};
}

// A set of notes to be played simultaneously
function chord() {
	return {
		type: 'chord',
		notes: [],
		addNote(note) {
			this.notes.push(note);
		}
	};
}

// A rest (time in which no notes are played)
function rest(length) {
	return {
		type: 'rest',
		length
	};
}

// A meta effect like setting tempo, root note, octave shifts, etc
function meta(effect, value = 0) {
	return {
		type: 'meta',
		effect,
		value
	};
}

// An error due to a bad input string
function error(str, index = -1) {
	return {
		type: 'error',
		str,
		index,
		errMsg() {
			return str + ' (at ' + index + ')';
		},
	};
}

// Returns a reader object that abstracts reading through
// a string
const stringReader = s => ({
	s, // the string we're reading
	len: s.length,
	currIndex: 0, // current index
	// Peek n spaces ahead (does not move index)
	peek(n = 0) {
		if(this.currIndex + n >= this.len) {
			return undefined;
		}
		
		return this.s[this.currIndex + n];
	},
	// Return next character and move ahead
	next() {
		if(this.currIndex >= this.len) {
			return undefined;
		}
		
		return this.s[this.currIndex++];
	},
	// Scan ahead to the next instance of str, consuming it
	// Return all characters consumed not including str
	// Returns an empty string if str is not found
	scanTo(str) {
		const strIdx = this.s.indexOf(str, this.currIndex);
		
		if(strIdx === -1) {
			return -1;
		}
		
		const consumed = this.s.substring(this.currIndex, strIdx);
		this.currIndex = strIdx + str.length;
		return consumed;
	},
	// Tells if the reader is at the end of the string
	eos() {
		return this.currIndex >= this.len;
	},
	// Consumes n characters with no return
	skip(n) {
		this.currIndex += n;
	}
});

// Given a string, return an int corresponding to its first character
// '0'-'9' yields 0-9, 'T' or 't' yields 10, 'E' or 'e' yields 11, otherwise -1
// Meant to be called on length 1 strings representing a note value
function noteCodeToInt(c) {
	const charCode = c.charCodeAt(0);
	// If c is a digit, return int version
	if(charCode >= 48 && charCode <= 57) {
		return charCode - 48;
	}
	
	// If c is T or t, return 10
	if(charCode === 84 || charCode === 116) {
		return 10;
	}
	
	// If c is E or e, return 11
	if(charCode === 69 || charCode === 101) {
		return 11;
	}
	
	return -1;
}

// Given a note length code and a base duration,
// return a note's adjusted duration
function calcDuration(baseDur, length) {
	let adjusted = baseDur;
	
	if(length > 0) {
		adjusted *= (1 + length);
	} else if(length < 0) {
		adjusted = adjusted / Math.pow(2, -length);
	}
	
	return adjusted;
}

// Preprocess: cleans the input code and handles user macros
function preprocess(code) {
	// Standardize whitespace and case
	return code.toUpperCase().replace(/\s/g, '');
}

// This prepares the input for sequencing by tokenizing and removing white space.
// Token types: notes, rests, chords, meta (like octave/tempo shifts)
// Returns an array of token arrays.
function lex(code) {
	let lexed = [];
	const readers = code.split(':').map(s => stringReader(s));
	
	let c;
	// Lex each sequence
	for(let r of readers) {
		let seq = []; // Tokens for this sequence
		let currChord; // Current chord we're adding to
		let rootNote = 48; // The baseline note
		let noteOffset = 0; // Cumulative offset of last note played for chord shaping
		let inShape = false; // Are we currently in a chord shape?
		let inChord = false; // Are we currently in a chord?
		let lookAhead; // How far we're looking ahead for note lengths etc
		
		// Read every character in the sequence
		while(!r.eos()) {
			c = r.next();
			switch(c) {
				case '0': // Notes
				case '1':
				case '2':
				case '3':
				case '4':
				case '5':
				case '6':
				case '7':
				case '8':
				case '9':
				case 'T':
				case 'E':
					let noteLength = 0;
					lookAhead = 0;
					
					// Determine note length
					while(r.peek(lookAhead) === '~') {
						noteLength++;
						lookAhead++;
					}
					
					if(lookAhead === 0) {
						while(r.peek(lookAhead) === '\'') {
							noteLength--;
							lookAhead++;
						}
					}
					
					r.skip(lookAhead); // Skip any look-aheads
					
					let noteCode = noteCodeToInt(c);
					// If we're in shape, add the previous code and 
					// update the running offset
					if(inShape) {
						noteCode += noteOffset;
						noteOffset = noteCode;
					}
					
					// Add new note to the chord or sequence
					const newNote = note(noteCode, noteLength);
					if(inChord) {
						currChord.addNote(newNote);
					} else {
						seq.push(newNote);
					}
					break;
					
				case '-': // Rests
					if(inShape) {
						return error("Rests disallowed in shape", r.currIndex);
					}
					
					if(inChord) {
						 return error("Rests disallowed in chord", r.currIndex);
					}
					
					// Look ahead to determine length of rest
					let restLength = 0;
					lookAhead = 0;
					while(r.peek(lookAhead) === '\'') {
							restLength--;
							lookAhead++;
					}
					
					r.skip(lookAhead); // Skip any look-aheads
					
					// Add rest to sequence
					seq.push(rest(restLength));
					break;
					
				case '[': // Enter chord
					if(inChord) {
						return error("Cannot nest chords", r.currIndex);
					}
					if(inShape) {
						return error("Cannot nest chords inside shapes", r.currIndex);
					}
					
					inChord = true;
					currChord = chord();
					break;
					
				case ']': // Exit chord
					if(!inChord) {
						return error("Attempt to close chord when not in shape", r.currIndex);
					}
					if(inShape) {
						return error("Close open shape before closing chords", r.currIndex);
					}
					
					inChord = false;
					seq.push(currChord);
					break;
					
				case '<': // Enter chord shape
					if(inShape) {
						return error("Cannot nest shapes", r.currIndex);
					}
					
					noteOffset = 0;
					inShape = true;
					break;
					
				case '>': // Exit chord shape
					if(!inShape) {
						return error("Attempt to close shape when not in shape", r.currIndex);
					}
					
					inShape = false;
					break;
				
				case '^': // Go up an octave
					seq.push(meta('octave_up'));
					break;
					
				case 'V': // Go down an octave
					seq.push(meta('octave_down'));
					break;
				
				case 'L': // Increase note length (but not timer)
					seq.push(meta('slur_up'));
					break;
				
				case 'S': // Decrease note length (but not timer)
					seq.push(meta('slur_down'));
					break;
					
				case '\'': // Note length divider out of place
					return error("\' symbols must follow notes or rests", r.currIndex);
					break;
				
				case '~': // Note length multiplier out of place
					return error("~ symbols must follow notes", r.currIndex);
					break;
					
				case '{': // Process meta
					const contents = r.scanTo('}');
					if(contents === -1) {
						return error("Unclosed meta", r.currIndex);
					}
					
					if(contents == '') {
						return error("Null meta", r.currIndex);
					}
					
					// TODO: multiple commands in one meta
					let [name, val] = contents.split("=");
					seq.push(meta(name, val));
					break;
				
				default:
					return error("Unknown symbol: " + c, r.currIndex);
					break;
			}
		}
		
		if(inShape) {
			return error("Chord shapes must be closed", r.currIndex);
		}
		
		if(inChord) {
			return error("Chords must be closed", r.currIndex);
		}
		
		lexed.push(seq);
	}
	
	return lexed;
}

// Extract note values and lengths from an array of lexed sequences
// Lexed sequences contain tokens: notes, rests, chords, meta
// Output: an array of note sets
function schedule(lexed, noteLength) {
	let noteSets = [];
	
	// Parse each lexed sequence
	for(let seq of lexed) {
		let baseNote = defaultBaseNote;
		let noteDur = noteLength;
		let durMult = 1;
		let time = 0;
		let volume = 1;
		let set = noteSet();
		
		// Parse each token
		for(let t of seq) {
			switch(t.type) {
				// Schedule a note
				case 'note':
					const dur = calcDuration(noteDur, t.length);
					set.addNote(time, Math.max(dur, noteDur * durMult), t.code + baseNote, volume);
					time += dur; // Schedule notes in sequence
					break;
				
				// Schedule a rest - simply advance time
				case 'rest':
					time += calcDuration(noteDur, t.length);
					break;
					
				case 'chord':
					let lowDur = Number.MAX_SAFE_INTEGER; // Keep track of lowest duration
					
					// Schedule notes in the chord
					for(let n of t.notes) {
						const dur = calcDuration(noteDur, n.length);
						set.addNote(time, Math.max(dur, noteDur * durMult), n.code + baseNote, volume);
						if(dur < lowDur) {
							lowDur = dur;
						}
					}
					
					// Advance time by minimum note duration
					time += lowDur;
					break;
				
				case 'meta':
					// TODO: oh no nested switches
					switch(t.effect) {
						// TODO: error handling for invalid note base (too high/low)
						case 'octave_up':
							baseNote += 12;
							break;
						case 'octave_down':
							baseNote -= 12;
							break;
						case 'slur_up':
							durMult++;
							break;
						case 'slur_down':
							if(durMult > 1) {
								durMult--;
							}
							break;
						case 'VOL':
							volume = parseFloat(t.value);
							break;
						default:
							return error("Undefined meta effect: " + t.effect);
					} // END silly nested switch
					break;
					
				default: // Should never get here; lexer shouldn't produce invalid token
					return error("Scheduling error: invalid token");
			}
		}
		
		// Add the completed note set to the return array
		noteSets.push(set);
	}
	
	return noteSets;
}

// Parse an RML string
// Returns: an array of noteSet or an error
function rmlParse(code, len = defaultDuration) {
	let sequences = preprocess(code);
	sequences = lex(sequences);
	
	if(sequences.type == 'error') {
		return sequences;
	}
	
	return schedule(sequences, len);
}

export default rmlParse;