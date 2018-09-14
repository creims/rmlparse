// context: an audio context with which to do conversions
// urls: an array of urls to load
// callback: function which is called with audio buffer array as a parameter
const loadAudio = function(context, urls, callback) {
	Promise.all(
		urls.map(url => 
			fetch(url)
				.then(response => response.arrayBuffer())
				.then(buf => context.decodeAudioData(buf)))
		).then(buffers => {
			callback(buffers);
		});
}

export default loadAudio;