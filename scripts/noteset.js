const noteSet = () => ({
	currIndex: 0,
	notes: [],
	
	addNote(time, schedDur, duration, noteCode, volume = 1) {
		this.notes.push({ time, schedDur, duration, noteCode, volume });
	},
	
	scaleNotes(ratio) {
		for(let note of this.notes) {
			note.duration *= ratio;
			note.time *= ratio;
		}
	},
	
	setStart(time) {
		for(let note of this.notes) {
			note.time += time;
		}
	},
	
	endTime() {
		const lastNote = this.notes[this.notes.length - 1];
		return lastNote.time + lastNote.duration;
	},
	
	nextNoteTime() {
		return this.notes[this.currIndex].time;
	},
	
	nextNote() {
		return this.notes[this.currIndex++];
	},
	
	reset() {
		this.currIndex = 0;
	},
	
	hasMoreNotes() {
		return this.currIndex < this.notes.length;
	},
	
	assignAudioBuffers(bufs) {
		for(let n of this.notes) {
			n.buffer = bufs[n.noteCode];
		}
	}
});

export default noteSet;