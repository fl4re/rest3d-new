// Server exemple
var Path 			= require('path');
var express 		= require('express');
var websocket		= require('websocket-stream');
var gltfStreamer 	= require('../src/server/glTFstreamer');


var app = express();
var basePath = Path.join(process.cwd(), 'viewer');
app.use(express.static(basePath));
//app.use(express.static('viewer/assets'));ç
app.use('/src/client', express.static('../src/client'));
//app.get('/');

//var server = http.createServer().listen(8080);


var VERBOSE = true;

function handle (stream){
	if (VERBOSE){
		console.log('-------------------------------- CONNECTION --------------------------------');
	}
	var assetManager = gltfStreamer.assetManager();
	assetManager.setbasePath(basePath);
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

var server = app.listen(8080);
//console.log(server.address().address);
websocket.createServer({server: server}, handle);
//this.webSocket.socket._socket.server.address().address;


