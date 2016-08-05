
// Server exemple

/* 
	Rest3d is a protocol to stream a glTF file to a Three.js client
	author: Selim Bekkar - selim.bekkar@gmail.com
	Starbreeze - June 2016 - v0.1.0

	The MIT License (MIT)

	Copyright (c) 2016 fl4re

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

var Path 			= require('path');
var express 		= require('express');
var websocket		= require('websocket-stream');
var gltfStream 		= require('../src/server/rest3d_server.js');


var app = express();
var basePath = Path.join(process.cwd(), 'viewer');
app.use(express.static(basePath));
app.use('/src/client', express.static('../src/client'));

var VERBOSE = false;

function handle (stream){
	if (VERBOSE){
		console.log('-------------------------------- CONNECTION --------------------------------');
	}
	var assetManager = gltfStream.assetManager();
	assetManager.setbasePath(basePath);
	assetManager.bindWebSocket(stream);
	assetManager.initEvent();

	stream.on('data', function(message){
		if(VERBOSE){
			console.log('------------------------------ DATA RECEIVED -------------------------------');
		}
		assetManager.feedbackManager(message);
	});

	stream.on('end', function(){
		if(VERBOSE){
			console.log('--------------------------- TRANSMITION CLOSED -----------------------------');
		}
	});
};

var server = app.listen(8080);
websocket.createServer({server: server}, handle);


