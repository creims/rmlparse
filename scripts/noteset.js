const noteSet = () => ({
	currIndex: 0,
	notes: [],
	
	addNote(time, duration, noteCode, volume = 1) {
		this.notes.push({ time, duration, noteCode, volume });
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