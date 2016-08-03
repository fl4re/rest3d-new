// Server exemple

var websocket		= require('websocket-stream');
var gltfStreamer 	= require('../src/server/glTFstreamer');



var VERBOSE = true;

function handle (stream){
	if (VERBOSE){
		console.log('-------------------------------- CONNECTION --------------------------------');
	}
	var assetManager = gltfStreamer.assetManager();
	assetManager.bindWebSocket(stream);
	assetManager.initEvent();

	stream.on('data', function(header){
		if(VERBOSE){
			console.log('------------------------------ DATA RECEIVED -------------------------------');
		}
		assetManager.feedbackManager(header);
	});

	stream.on('end', function(){
		if(VERBOSE){
			console.log('--------------------------- TRANSMITION CLOSED -----------------------------');
		}
	});
};


websocket.createServer({server: wss}, handle);



