let timerID = null;
let going = false;
let interval = 25;

self.onmessage = function(e) {
	if(e.data == 'start') {
		if(going) {
			return;
		}
		
		going = true;
		timerID = setInterval(() => {
			postMessage('tick');
			}, interval);
	} else if(e.data == 'stop') {
		if(!going) {
			return;
		}

		clearInterval(timerID);
		timerID = null;
		going = false;
	} else {
		console.log('Unknown message passed to worker');
	}
}