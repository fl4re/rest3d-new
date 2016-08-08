/* 
	Rest3d_server is an API to feed a Three.js client with a glTF file
	@author: Selim Bekkar - selim.bekkar_at_contractors.starbreeze.com
	Starbreeze - August 2016 - v0.1.3

	The MIT License (MIT)

	Copyright (c) 2016 Starbreeze LA Inc.

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
'use strict';

var fs 				= require('fs');
var Url 			= require('url');
var util 			= require('util');
var eventEmitter 	= require('events');
var Path 			= require('path').posix;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////// TOOL BOX /////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var VERBOSE = false;


//Note: Compute sqrt is useless. More expensive for no gain in our futur usage.
var computeL2SquaredNorm = function (vectorA, vectorB){
	var l2SquaredNorm = 0;
	for (var i = 0; i<vectorA.length; i++){
		l2SquaredNorm += (vectorA[i]-vectorB[i]) * (vectorA[i]-vectorB[i]);
	}
	return l2SquaredNorm;
};

var createRelativeURL = function(basePath, baseURL, fileName){
	var relativeURL = Path.relative(basePath.replace(/\\/g,'/'), baseURL.replace(/\\/g,'/'));
	return Path.join(relativeURL,fileName);
};

//https://github.com/darkskyapp/string-hash
var hashFunction = function(str) {
	var hash 	= 5381;
	var i 		= str.length;

	while(i){
		hash = (hash * 33) ^ str.charCodeAt(--i);
	}
	return hash >>> 0;
};
	
var getSizeOfType = function (type) {
	switch (type) {
		case 'SCALAR':
			return 1;
		case 'VEC2':
			return 2;
		case 'VEC3':
			return 3;
		case 'VEC4':
			return 4;
		case 'MAT2':
			return 4;
		case 'MAT3':
			return 9;
		case 'MAT4':
			return 16;
		default :
			return -1;
	}
};

var getSizeOfComponentType = function (type) {
	switch (type) {
		case 5120:
			return 1;
		case 5121:
			return 1;
		case 5122:
			return 2;
		case 5123:
			return 2;
		case 5126:
			return 4;
		default :
			return -1;
	}
};

//This function is used to send some errors or warning to the client.
var messageDelivery = function (type, location, fct, message, webSocket){
	var headerType;
	var head = '';
	switch(type){
		case 'error':
			headerType = 'er';
			head = 'ERROR';
			break;
		case 'warning':
			headerType = 'wa';
			head = 'WARN';
			break;
		default :
			return;
	}
	var fb = {
		_i: headerType,
		message: '['+head+' in: '+fct+' from: '+location+'] '+message
	};
	webSocket.write(JSON.stringify(fb));
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////// CLASSES /////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function NodeInfo(){	
	this.id 		= '';
}

NodeInfo.prototype.fill = function (jsonNode){

	if(jsonNode.name !== undefined)			{ this.name 		= jsonNode.name; }
	if(jsonNode.camera !== undefined)		{ this.camera 		= jsonNode.camera; }
	if(jsonNode.skeletons !== undefined)	{ this.skeletons 	= jsonNode.skeletons.slice(0); }
	if(jsonNode.skin !== undefined)			{ this.skin 		= jsonNode.skin; }
	if(jsonNode.jointName !== undefined)	{ this.jointName 	= jsonNode.jointName; }
	if(jsonNode.meshes !== undefined)		{ this.meshes 		= jsonNode.meshes.slice(0); }
	if(jsonNode.matrix !== undefined)		{ this.matrix 		= jsonNode.matrix.slice(0); }
	if(jsonNode.rotation !== undefined)		{ this.rotation 	= jsonNode.rotation.slice(0); }
	if(jsonNode.scale !== undefined)		{ this.scale 		= jsonNode.scale.slice(0); }
	if(jsonNode.translation !== undefined)	{ this.translation 	= jsonNode.translation.slice(0); }

};

function WayCrossed(){
		this.info 	= {}; //NodeInfo
		this.parent = []; //Array of WayCrossed
}

/* To print the Transversal in console. Only for debugging */
WayCrossed.prototype.print = function (offset){
	console.log(offset+' '+this.info.id);
	for (var i = 0; i < this.parent.length; i++) {
		this.parent[i].print(offset+'	');
	}
};


function NodeHierarchy(){
	this.parent 	= []; //Array of NodeHiearchy
	this.children 	= []; //Array of NodeHiearchy
	this.traversed 	= false; //A flag to color our node when we compute our heightTransversal.
	this.info 		= new NodeInfo();
}	

/* To print the Graph in console. Only for debugging */
NodeHierarchy.prototype.print = function (offset){
	console.log(offset+' '+this.info.id);
	for (var i = 0; i < this.parent.length; i++) {
		this.parent[i].print(offset+'	');
	}
};

/* This function tranverse our graph in height and concaten infos until she find a node alredy sent*/
NodeHierarchy.prototype.heightTransversal = function (){

	var wayCrossed = new WayCrossed();

	if (this.traversed){ //if the node has been already traversed that means we already know/sent all the hierachy above him
						 // Thus we only need his ID to be founded and bonded by the client structure.
		wayCrossed.info.id = this.info.id;
		return wayCrossed;
	}

	else{
		this.traversed = true;
		wayCrossed.info = this.info;

		for (var i=0; i<this.parent.length; i++){
			wayCrossed.parent.push(this.parent[i].heightTransversal());
		}
		return wayCrossed;
	}
};

/*This object store different views of our NodeHierarchy, because for ex: we need to be able to find quickly all the Nodes linked with a particular mesh*/
function NodeManager(){
	this.meshView 		= {}; //a dictionary of NodeHierarchy array, where the keys are the meshID
	this.skeletonView 	= {};
	this.skinView 		= {};
	this.jointNameView 	= {};
	this.cameraView 	= {};
	this.nodeView 		= {};
}

NodeManager.prototype.addNode = function (node, key, type){
	var dictionary;
	switch (type){
		case 'mesh':
			dictionary=this.meshView;
			break;
		case 'skeleton':
			dictionary=this.skeletonView;
			break;
		case 'skin':
			dictionary=this.skinView;
			break;
		case 'jointName':
			dictionary=this.jointNameView;
			break;
		case 'camera':
			dictionary=this.cameraView;
			break;
		case 'node':
			dictionary=this.nodeView;
			break;
		default:
			messageDelivery('warning','addNode', 'NodeManager', type+' is unknown', this.webSocket);
	}
	if (dictionary[key] === undefined) { 
		dictionary[key] = [];
	}
	dictionary[key].push(node);
};

NodeManager.prototype.getNodes = function (key, type){
	var dictionary;
	switch (type){
		case 'mesh':
			dictionary=this.meshView;
			break;
		case 'skeleton':
			dictionary=this.skeletonView;
			break;
		case 'skin':
			dictionary=this.skinView;
			break;
		case 'jointName':
			dictionary=this.jointNameView;
			break;
		case 'camera':
			dictionary=this.cameraView;
			break;
		case 'node':
			dictionary=this.nodeView;
			break;
		default:
			messageDelivery('warning','addNode', 'NodeManager', type+' is unknown', this.webSocket);
	}
	if (dictionary[key] === undefined) { 
		return [];
	}
	else{
		return dictionary[key];
	}
};


/*This object describe what kind of data it is, where to find it, and give us the way to send it to the client*/
function DataToSend () {
	this.nature 					= undefined; 
	this.transfered 				= false;
	this.offsetFromPreviousChunk 	= 0;
	this.paused 					= false;
	this.info 						= {};
}

DataToSend.prototype.displayTree = function(offset){
	//console.log(offset+' '+this.nature);
};

DataToSend.prototype.init = function (info, nature, guid){

	var dataInfo 	= JSON.parse(JSON.stringify(info));
	dataInfo.guid 	= guid;

	//We need to split the dataInfo because a part should stay on the server like binaries path, min and max...
	if (nature === 'BUFFER'){
		//this.min = dataInfo.min === undefined ? 0 : dataInfo.min;
		this.min 	= dataInfo.min;
		this.max 	= dataInfo.max;
		this.path 	= dataInfo.path;
		this.offset = dataInfo.offset;
		this.stream = undefined;
		delete dataInfo.max;
		delete dataInfo.min;
		delete dataInfo.path;
		delete dataInfo.offset;
	}
	else if (nature === 'MATERIAL'){
		this.values 		= dataInfo.values;
		this.technique 	= dataInfo.technique;
		delete dataInfo.values;
		delete dataInfo.technique;
	}
	else if (nature === 'TEXTURE'){
		this.path = dataInfo.path;
		delete dataInfo.path;
	}
	else if (nature === 'CAMERA'){
		//nothing to do. Send every info.
	}
	else if (nature === 'ANIM_CHAN'){
		//nothing to do. Send every info.
	}
	else if (nature === 'SKIN'){
		this.path 	= dataInfo.path;
		this.offset = dataInfo.offset;
		this.stream = undefined;
		delete dataInfo.path;
		delete dataInfo.offset;
	}
	this.info 	= dataInfo;
	this.nature = nature; //Note: 'nature' will not be sent because client can deduce it from other header properties
};

DataToSend.prototype.getHeader = function (){
	var header = JSON.parse(JSON.stringify(this.info));
	switch(this.nature){
		case 'BUFFER':
			header._i = 'bi';
			break;
		case 'TEXTURE':
			header._i = 'ti';
			break;
		case 'MATERIAL':
			header._i = 'mi';
			break;
		case 'CAMERA':
			header._i = 'ci';
			break;
		case 'SKIN':
			header._i = 'si';
			break;
		case 'ANIM_CHAN':
			header._i = 'aci';
			break;
	}
	return header;
};

/*We have differents behaviors for sending data:
	-it's a buffer: we create a readabe stream
	-it's a texture: we sent her path and let the client managing that by taking advantage of native protocols for images
	-it's a material: we sent his parameter as a JSON
	-? TODO */
/* This function return :
	- -1 if the data is not sendable
	- 0  if the data transfert is in progress
	- 1  if the transfer was already done */
DataToSend.prototype.sendData = function (attribute, webSocket, sizeMaxChunk){
	if (this.nature === undefined){
		messageDelivery('warning',JSON.stringify(this.info), 'DataToSend.sendData', 'His nature is undefined', webSocket);
		return -1; 
	}
	if (this.transfered === true){
		return 1;
	}
	this.attribute = attribute;

	if (this.nature === 'TEXTURE'){
		var textureData = {_i: 'td', path: this.path};
		webSocket.write(JSON.stringify(textureData));
		this.transfered = true;
		return 1;
	}
	else if (this.nature === 'MATERIAL'){
		var materialData = {_i: 'md', values: this.values, technique: this.technique};
		webSocket.write(JSON.stringify(materialData));
		this.transfered = true;
		return 1;
	}
	else if (this.nature === 'BUFFER' || this.nature === 'SKIN'){
		//We check if the stream was not already created
		if(this.stream !== undefined && this.paused){
			this.stream.resume();
			this.paused = false;
		}
		else { //Else, create the stream and pipe it to the websocket
			var sizeType = getSizeOfType(this.info.type);
			if (sizeType<0){
				messageDelivery('error', this.nature, 'getSizeOfType', this.info.type+' unknown', webSocket);
			}
			var sizeCompType = getSizeOfComponentType(this.info.componentType);
			if (sizeCompType<0){
				messageDelivery('error', this.nature, 'getSizeOfComponentType', this.info.componentType+' unknown', webSocket);
			}
			var totalSize = this.info.count * sizeType * sizeCompType;
			var size =  totalSize - this.offsetFromPreviousChunk; //what we need to transfert

			sizeMaxChunk = sizeMaxChunk===undefined ? size:sizeMaxChunk;

			if (size > sizeMaxChunk){ 
				size = sizeMaxChunk;
			}
			var begining = this.offset + this.offsetFromPreviousChunk;
			var to = begining + size -1;
			try {this.stream = fs.createReadStream( this.path, {start:begining, end: to} );}
			catch(e){
				messageDelivery('error',JSON.stringify(this.info), 'DataToSend.sendData', e, webSocket);
			}

			this.offsetFromPreviousChunk += size;
			var that = this;

			this.stream.on('end', function(){
				if (that.offsetFromPreviousChunk >= totalSize){
					that.transfered = true;
				}
				that.attribute.dataSent();
			});	

			this.stream.pipe(webSocket, {end: false});
			return 0;
		}
	}
	else if (this.nature === 'CAMERA'){ 
		this.transfered = true;
		return 1;	
	}
	else if (this.nature === 'ANIM_CHAN'){
		this.transfered = true;
		return 1;
	}
	else if (this.nature === 'OTHER'){ 
		/*TODO*/
	}
};

DataToSend.prototype.pauseStream = function(){
	if (this.stream !== undefined && this.transfered === false){
		this.stream.pause();
		this.paused = true;
	}
};

/*This object store all our data and manage them*/
function DataManager () {
	this._dataDictionary = {};
}

DataManager.prototype.createId = function (type, dataInfo){

	return hashFunction(JSON.stringify(dataInfo)+type);
};

/*This function should be the only way to access to the datas*/
DataManager.prototype.manage = function (type, dataInfo){
	
	var dataId 		= this.createId(type, dataInfo);
	var dataToSend 	= this._dataDictionary[dataId];

	if(dataToSend === undefined){

		var nature;

		var buffObj = ['POSITION','NORMAL','TEXCOORD','COLOR','JOINT','JOINTMATRIX','WEIGHT','indices'];

 		var isContained = function (arg){
 	 		return type.indexOf(arg) === 0;
 		};

 		if(buffObj.find(isContained)){ 
 			nature = 'BUFFER';
 		}
 		else if(type === 'material'){
 			nature = 'MATERIAL';
 		}
 		else if(type === 'TEXTURE'){
 			nature = 'TEXTURE';
 		}
 		else if(type === 'camera'){
 			nature = 'CAMERA';
 		}
 		else if(type === 'skin'){
 			nature = 'SKIN';
 		}
 		else if(type === 'animationParameter'){ 
 			nature = 'BUFFER';
 		}
 		else if(type === 'animationChannel'){
 			nature = 'ANIM_CHAN';
 		}
 		else{
 			/*TODO*/
 			return -1;
 		}

		dataToSend = new DataToSend();
		dataToSend.init(dataInfo, nature, dataId);
		this._dataDictionary[dataId] = dataToSend;

	}
	return dataToSend;
};

//This is a stack of {attributeName,dataToSend} to ranking the transfer process of all the datas of a same primitive/property
//Each objects in the asset must have his own AttributesToSend. 
function AttributesToSend (){
	this.parent 		= undefined; //can be a primitive or a property
	this.behavior 		= {sort:'DEFAULT', display:'DEFAULT', extra: 'NONE'};
	this.datasToSend 	= []; //stack of tuples {attribute, data}
}

AttributesToSend.prototype.displayTree = function(offset){
	for (var i=0; i<this.datasToSend.length; i++){
		console.log(offset+this.datasToSend[i].attribute);
		this.datasToSend[i].data.displayTree(offset+'	');
	}
};

AttributesToSend.prototype.addDataToSend = function (name, data){
	for (var i=0; i<this.datasToSend.length; i++){
		if (this.datasToSend[i].data.info.guid === data.info.guid){ //this data has already been added, so return;
			return;
		}
	}
	this.datasToSend.push({attribute: name, data: data});
};


AttributesToSend.prototype.getHeader = function (n){
	n = typeof n !== 'undefined' ? n : 0;
	var header = this.datasToSend[n].data.getHeader();
	header.attribute = this.datasToSend[n].attribute;
	return header;
};

// AttributesToSend.prototype.getAttributeTypeCurrentData = function (){
// 	return this.datasToSend[0].attribute;
// };

AttributesToSend.prototype.sendData = function (webSocket, parent, sizeChunk){
	this.parent = parent;
	if (this.datasToSend.length <= 0){ //This should never happend
		messageDelivery('warning','', 'AttributesToSend.sendData', 'Nothing to send', webSocket);
		return -1;
	}
	var progress = this.datasToSend[0].data.sendData(this, webSocket, sizeChunk);

	if (progress === 1){
		this.dataSent();
	}
};

/* A data has been sent, so we need to select the next one */
AttributesToSend.prototype.dataSent = function (){

	if(VERBOSE){
		console.log('            '+this.datasToSend[0].attribute+' Sent');
	}

	var attributeTypeSent = this.datasToSend[0].attribute;

	if (this.datasToSend[0].data.transfered){ //everything as been sent so we can remove this data.
		this.datasToSend.shift();
	}
	else{ //We sent only one chunk so permut our stack
		var data = this.datasToSend.shift();
		this.datasToSend.push(data);
	}

	if (this.datasToSend.length === 0){
		this.parent.emit('attributesSent');
		//this.parent.attributeSent();
	}
	else{
		this.parent.emit('dataSent', attributeTypeSent);
	}
};

AttributesToSend.prototype.pauseStream = function(){
	this.datasToSend[0].data.pauseStream();
};

/* Here we sort the attributes (if they exist), depending of what kind of display behavior we want.
 Actually only one mode is supported: 'default'. This rank was only choosen to provide a nice effect while displaying.*/
AttributesToSend.prototype.sort = function (){

	var datasToSendSorted = [];

	var extractAndPush = function (listInit, listRez, attribute) {

		var index = listInit.findIndex(function(element, index, array){
			return element.attribute === attribute;
		});
		if (index >=0){
			var elt = listInit.splice(index, 1);
			listRez.push(elt[0]);
			extractAndPush(listInit, listRez, attribute);
		}
		else { 
			return;
		}
	};

	if (this.behavior.sort === 'DEFAULT'){

		
		extractAndPush (this.datasToSend, datasToSendSorted, 'indices');
		extractAndPush (this.datasToSend, datasToSendSorted, 'POSITION');
		extractAndPush (this.datasToSend, datasToSendSorted, 'NORMAL');
		extractAndPush (this.datasToSend, datasToSendSorted, 'TEXCOORD_0');
		extractAndPush (this.datasToSend, datasToSendSorted, 'TEXTURE');
		extractAndPush (this.datasToSend, datasToSendSorted, 'material');

		//To be sure to receive animation parameters before channel. TO RETHINK
		extractAndPush (this.datasToSend, datasToSendSorted, 'Anim_Param_TIME');
		extractAndPush (this.datasToSend, datasToSendSorted, 'Anim_Param_scale');
		extractAndPush (this.datasToSend, datasToSendSorted, 'Anim_Param_rotation');
		extractAndPush (this.datasToSend, datasToSendSorted, 'Anim_Param_translation');

		for (var i = 0; i<this.datasToSend.length; i++){
			datasToSendSorted.push(this.datasToSend[i]);
		}
		

		this.datasToSend = datasToSendSorted;
	}

	else {
		/*ADD OTHER BEHAVIOR HERE*/
		return -1;
	}

	return 0;
};

AttributesToSend.prototype.setBehavior = function (behavior){
	if (behavior.attribute !== undefined){
		this.behavior.sort 		= behavior.attribute.sort 	=== undefined ? 'DEFAULT':behavior.attribute.sort;
		this.behavior.display 	= behavior.attribute.display=== undefined ? 'DEFAULT':behavior.attribute.display;
		this.behavior.extra 	= behavior.attribute.extra 	=== undefined ? 'NONE':behavior.attribute.extra;
		this.sort();
	}
};


/*This object gather all the primitives of a mesh.
He is here to follow the gltf design and also to help the management of different transfert behaviors. 
Skin and Animation will be also considered as a primitive. */
function MeshToSend () {
	eventEmitter.call(this);
	this.primitives 	= []; // this is a stack of tuples {primitiveNum, type, attributes, score};
	this.animations		= []; // this is a stack of tuples {attributeName, type, attributes, score}; //this gather skin and animations beceause they are common for all primitives.
	this.parent 		= undefined;
	this.nextTypeToSend = 'Primitive';
	this.isSkinned 		= false;
	this.behavior 		= {sort:'DEFAULT', display:'DEFAULT', extra:'NONE'};
	
}
util.inherits(MeshToSend, eventEmitter);

MeshToSend.prototype.displayTree = function(offset){
	for (var i=0; i<this.primitives.length; i++){
		console.log(offset+' Primitive n: '+ this.primitives[i].primitiveNum+' | score: '+ this.primitives[i].score);
		this.primitives[i].attributes.displayTree(offset+'	');
	}
	for (i=0; i<this.animations.length; i++){
		console.log(offset+' Animation name: '+ this.animations[i].attributeName+' | score: '+ this.animations[i].score);
		this.animations[i].attributes.displayTree(offset+'	');
	}
};

MeshToSend.prototype.addPrimitiveToSend = function (primitiveNUM, type, attributesToSend){
	var warning = 0;
	if (type!== undefined && type !== 4){ //That means it's not a 'TRIANGLES' primitive
		warning = -1; // 
	}
	this.primitives.push({primitiveNum: primitiveNUM, type: type, attributes: attributesToSend, score: 0 });
	return warning;
};

MeshToSend.prototype.addAnimationToSend = function (attributeName, type, attributesToSend){
	var warning = 0;
	if (type !== 'skin'  && type !== 'anim'){ //That is a unknow type
		warning = -1; // 
	}
	this.animations.push({attributeName: attributeName, type: type, attributes: attributesToSend, score: 0 });
	return warning;
};

MeshToSend.prototype.pauseStream = function(){
	this.primitives[0].attributes.pauseStream();
	this.animations[0].attributes.pauseStream();
};

MeshToSend.prototype.sendData = function (webSocket){
	// if(this.primitives.length <= 0 && this.attribute.length <= 0){
	// 	messageDelivery('warning','', 'MeshToSend.sendData', 'No primitives to send', webSocket);
	// 	return;
	// }
	var sizeChunk;
	if (this.nextTypeToSend === 'Animation'){
		if (this.behavior.extra.indexOf('TEMPORAL')>=0 && this.animations[0].type === 'anim'){ //we only want this mode for temporal animation key
			sizeChunk = this.parent.sizeOfAnimChunk;
		} 
		this.animations[0].attributes.sendData(webSocket, this, sizeChunk);
	}
	else{
		this.primitives[0].attributes.sendData(webSocket, this);
	}
	
};

MeshToSend.prototype.getHeader = function (n,v){
	n = typeof n !== 'undefined' ? n : 0;
	v = typeof v !== 'undefined' ? v : 0;
	var header;
	if (this.nextTypeToSend === 'Animation'){
		header 			= this.animations[v].attributes.getHeader(n);
		header.animName = this.animations[v].attributeName;
	}
	else{
		header 			= this.primitives[v].attributes.getHeader(n);
		header.primNum 	= this.primitives[v].primitiveNum;
	}
	return header;
};

// MeshToSend.prototype.getAttributeTypeCurrentData = function (){
// 	return this.primitives[0].attributes.getAttributeTypeCurrentData();
// };

MeshToSend.prototype.dataSent = function (attributeTypeSent){
	var res = 0;

	if(this.permutCounterPrim>=this.primitives.length-1){
		res = 1;
		this.permutCounterPrim = 0;
	}
	if(this.permutCounterAnim>=this.animations.length-1){
		res = 1;
		this.permutCounterAnim = 0;
	}

	if (this.behavior.display === 'DEFAULT'){
		if (this.nextTypeToSend === 'Primitive'){
			this.permutCounterPrim += 1;
			//We don't want to permut for indices because indices display nothing.
			if (attributeTypeSent!=='indices'){
				var primitive = this.primitives.shift();
				this.primitives.push(primitive);
			}
			//this.parent.emit('dataSent', attributeTypeSent, res);
		}
		else if (this.nextTypeToSend === 'Animation' && this.behavior.extra.indexOf('TEMPORAL')>=0){ 
			this.permutCounterAnim += 1;
			if (attributeTypeSent!=='skin'){ //no permutation for skin.
				var anim = this.animations.shift();
				this.animations.push(anim);
			}
		}

		this.parent.emit('dataSent', attributeTypeSent, res);
	}
	else if (this.behavior.display === 'ONEAFTERONE'){
		this.parent.emit('dataSent', attributeTypeSent, res);
	}
	else{
		//Add new behavior here
	}
	
};

MeshToSend.prototype.attributesSent = function (){
	if (this.nextTypeToSend === 'Primitive'){
		if(VERBOSE){
			console.log('        '+'Primitive n:'+this.primitives[0].primitiveNum+' Sent');
		}
		this.primitives.shift();

		if(this.primitives.length === 0){
			if (this.animations.length === 0){
				this.parent.emit('meshSent');
			}
			else{
				this.nextTypeToSend = 'Animation';
				this.parent.emit('allPrimitivesSent');
			}
		}
		else{
			this.parent.emit('primitiveSent');
		}
	}
	else {
		if(VERBOSE){
			console.log('        '+'Anmation n:'+this.animations[0].attributeName+' Sent');
		}
		this.animations.shift();

		if(this.animations.length === 0){
			if (this.primitives.length === 0){
				this.parent.emit('meshSent');
			}
			else{
				this.nextTypeToSend = 'Primitive';
				this.parent.emit('allAnimationSent');
			}
		}
		else{
			this.parent.emit('attributeAnimationSent');
		}

	}
};

/*This is a function to sort our primitive. Actually you can choose between:
	- 'DEFAULT' no sorting and let the original sort found in gltf file
	- 'BB_DIST_ASCENDING' sort primitves by the L2 bounding box norm of 'POSITION' attribute */
MeshToSend.prototype.sort = function (){

	var that = this;
	var compareFunction = function (eltA, eltB){
		return eltB.score - eltA.score;
	};	
	var computeScore = function (elt){return 0;};

	if (this.behavior.sort === 'BB_DIST_ASCENDING'){
		computeScore = function(primitive){
			var indexPosition = primitive.attributes.datasToSend.findIndex(function(elt,index,array){
									return elt.attribute === 'POSITION';
								});

			if (indexPosition === -1){ 
				messageDelivery('error',indexPosition, 'MeshToSend.sort', 'This primitive dont have any POSITION attribute', that.parent.webSocket);
				return 0;
			}
			else{
				var dataPosition = primitive.attributes.datasToSend[indexPosition].data;
				var max = dataPosition.max;
				var min = dataPosition.min;
				if (max === undefined || min === undefined ){
					messageDelivery('warning',indexPosition, 'MeshToSend.sort', 'Dont have min and max properties for computing the ranking asked', that.parent.webSocket);
					return 0;
				}
				return computeL2SquaredNorm(max, min);
			}
		};
	}
	else { //this.behavior === 'DEFAULT'
	}
	//First we compute the score of each primitive
	for (var i=0; i<this.primitives.length; i++){
		this.primitives[i].score=computeScore(this.primitives[i]);
	}
	//Then we sort the array
	this.primitives.sort(compareFunction);


	//Then we sort animationAttributes
	computeScore = function(primitive){
		if (primitive.type === 'skin'){
			return 2;
		}
		else if (primitive.type === 'anim'){ //anim must be send after skin 
			return 1;
		}
		else {
			return 0;
		}
	};
	for (i=0; i<this.animations.length; i++){
		this.animations[i].score=computeScore(this.animations[i]);
	}
	this.animations.sort(compareFunction);

};

MeshToSend.prototype.setBehavior = function (newBehavior){
	if (newBehavior.primitive !== undefined){
		this.behavior.sort = newBehavior.primitive.sort===undefined ? 'DEFAULT':newBehavior.primitive.sort;
		this.behavior.display = newBehavior.primitive.display===undefined ? 'DEFAULT':newBehavior.primitive.display;
		this.behavior.extra = newBehavior.primitive.extra===undefined ? 'NONE':newBehavior.primitive.extra;
		this.sort();
	}
	if (this.behavior.extra.indexOf('ANIM_IN_FIRST')>=0){
		this.nextTypeToSend = 'Animation';
	}
	for(var i=0; i<this.primitives.length; i++){
		this.primitives[i].attributes.setBehavior(newBehavior);
	}
	for(i=0; i<this.animations.length; i++){
		this.animations[i].attributes.setBehavior(newBehavior);
	}
};

MeshToSend.prototype.initMeshToSend = function (parent){
	this.parent 		= parent;
	this.permutCounter 	= 0; //This counter is use to know when we have made a complet permutation cycle. (ex: when have we send all positions of all the primitives)
	this.on('dataSent', function(typeSent){ this.dataSent(typeSent); });
	this.on('attributesSent', function(){ this.attributesSent(); });
};



function AssetManager () {
	eventEmitter.call(this);
	this.properties 	= []; // This is a stack of properties defineds by a tuple {propertyID, propertyName, property, score}. A property can be primitives or attributes
						  //'score' is compute with the sorting method and used to rank our stack. 
	this.webSocket 		= undefined;
	this.basePath		= __dirname;
	this.launched 		= false;
	this.sizeOfAnimChunk= 32;
	this.behavior 		= {sort:'DEFAULT', display:'DEFAULT', extra: 'INDICES'}; 
	this.info 			= {};
	this.transfertOrder = undefined;
	this.path 			= undefined;
	this.dataManager 	= new DataManager();
	this.nodeManager 	= new NodeManager();
}
util.inherits(AssetManager, eventEmitter);


// AssetManager.prototype.getAttributeTypeCurrentData = function (){
// 	return this.properties[0].property.getAttributeTypeCurrentData();
// };

AssetManager.prototype.displayTree = function(offset){
	for (var i=0; i<this.properties.length; i++){
		console.log(offset+' Property: '+ this.properties[i].propertyID+' | score: '+this.properties[i].score + ' | traversed: '+this.properties[i].traversed );
		this.properties[i].property.displayTree(offset+'	');
	}
};

AssetManager.prototype.addPropertyToSend = function (propID, prop, name){
	this.properties.push({propertyID: propID, property: prop, propertyName: name, score: 0});
};

AssetManager.prototype.bindWebSocket = function(socket){
	this.webSocket=socket;
};

AssetManager.prototype.initEvent = function(){
	var that = this;
	this.on('dataSent', function(typeSent, res){
			that.dataSent(typeSent, res);
	});
	this.on('allAnimationSent', function(){
		that.allAnimationSent();
	});
	this.on('meshSent', function(){
		that.meshSent();
	});
	this.on('attributeAnimationSent', function(){
		that.attributeAnimationSent();
	});
	this.on('allPrimitivesSent', function(){
			that.allPrimitivesSent();
	});
	this.on('primitiveSent', function(){
			that.primitiveSent();
	});
	this.on('attributesSent', function(){ //we autorize to pass trough the mesh view (usefull for camera)
			that.meshSent();
	});
	this.on('sortingRequired', function(behavior){
			that.setBehavior(behavior);
	});

	this.on('loadAsset', function(path){
		if(VERBOSE){
			console.log('loading asset...');
		}
		var gltfAsset = that.openAsset(path);
		that.parseGltf(gltfAsset);
		that.setBehavior(that.transfertOrder);
		if(VERBOSE){
			console.log('>>>>>>>>>>>>> Sorting OK <<<<<<<<<<<<<<');
			this.displayTree('');
		}
		that.sendAsset();
	});
};

AssetManager.prototype.sort = function(){

	var that = this;
	var compareFunction = function (eltA, eltB){
			return eltB.score - eltA.score;
		};
	var computeScore;

	if (this.behavior.sort === 'MAX_ASCENDING'){

		computeScore = function(property){
			var distPrimitivesMax = 0;
			//This property is a camera
			if (property.datasToSend && property.datasToSend[0].attribute==='camera'){
				if (that.behavior.extra.indexOf('CAMERAS_IN_LAST')>=0){
					return -1; //To send them in last
				}
				else{
					return Infinity; //To send them in first
				}
			}
			//this is a mesh
			for (var i=0; i<property.primitives.length; i++){
				if (property.primitives[i].score > distPrimitivesMax){
					distPrimitivesMax = property.primitives[i].score;
				}
			}
			return distPrimitivesMax;
		};

		
	}

	else { //this.behavior === 'DEFAULT'
		computeScore = function(property){
			if (property.datasToSend && property.datasToSend[0].attribute==='camera'){
				if (that.behavior.extra.indexOf('CAMERAS_IN_LAST')>=0){
					return -1; //To send them in last
				}
				else{
					return Infinity; //To send them in first
				}
			}
			return 0;
		};
	}

	//First we compute the score of each primitive
	for (var i=0; i<this.properties.length; i++){
		this.properties[i].score=computeScore(this.properties[i].property);
	}

	//Then we sort the array
	this.properties.sort(compareFunction);
	/*TODO*/
};

AssetManager.prototype.setBehavior = function(newBehavior){
	if (newBehavior===undefined){
		newBehavior = {	asset: 		{sort:'DEFAULT', display:'ONEAFTERONE', extra:'INDICES'}, 
						primitive: 	{sort:'DEFAULT', display:'ONEAFTERONE', extra:'NONE'}, 
						attribute: 	{sort:'DEFAULT'}};
	}
	if (VERBOSE){
		console.log('------------------------ CHANGE AssetManager BEHAVIOR -----------------------');
		console.log(newBehavior);
	}
	if(this.launched){
		this.pauseStream();
	}

	this.transfertOrder = newBehavior;
	
	for (var i=0; i<this.properties.length; i++){
		this.properties[i].property.setBehavior(newBehavior);
	}
	if (newBehavior.asset !== undefined){
		this.behavior.sort 		= newBehavior.asset.sort 	=== undefined ? 'DEFAULT':newBehavior.asset.sort;
		this.behavior.display 	= newBehavior.asset.display === undefined ? 'DEFAULT':newBehavior.asset.display;
		this.behavior.extra 	= newBehavior.asset.extra 	=== undefined ? 'INDICES':newBehavior.asset.extra;
		this.sort();
	}
};

AssetManager.prototype.pauseStream = function(){
	if(!this.launched || this.properties.length<=0){
		return;
	}
	this.properties[0].property.pauseStream();
	this.launched=false;
};

AssetManager.prototype.sendData = function(){
	if(this.properties.lenth <= 0 ){
		messageDelivery('warning','AssetManager', 'sendData', 'No property to send', this.webSocket);
		return;
	}
	this.properties[0].property.sendData(this.webSocket, this);
};

AssetManager.prototype.sendHeader = function(){
	var nodesHierarchy, tmp, hierarchy, i;
	var header 			= this.properties[0].property.getHeader();
	header.propertyID 	= this.properties[0].propertyID;
	header.propertyName = this.properties[0].propertyName;
	/*TO DO*/
	
	if(header.attribute === 'camera'){
		nodesHierarchy = this.nodeManager.getNodes(header.propertyID,'camera');
		hierarchy = [];
			for (i = 0; i<nodesHierarchy.length; i++){
			tmp = nodesHierarchy[i].heightTransversal();
			tmp.print('headerCamera');
			hierarchy.push(tmp);
		}
		header.hierarchy=hierarchy;
	}
	else if(header.attribute === 'TEXTURE'){
		// Nothing ! A texture don't have hierarchy
	}
	else if(header.attribute === 'animation'){
	}
	else { //it's a mesh (JOINT, POSITION, SKIN....)
		if (header.attribute === 'skin'){
			var jointNamesHierarchy = [];
			for (i=0; i<header.jointNames.length; i++){
				var jointNode = this.nodeManager.getNodes(header.jointNames[i],'jointName');
				var jointNodeHierarchy = jointNode[0].heightTransversal(); //0 beacause we are sure to have only one jointNode
				jointNamesHierarchy.push(jointNodeHierarchy);
			}
			header.jointNames = jointNamesHierarchy;
		}
		nodesHierarchy = this.nodeManager.getNodes(header.propertyID,'mesh');
		hierarchy = [];
			for (i = 0; i<nodesHierarchy.length; i++){
			tmp = nodesHierarchy[i].heightTransversal();
			//tmp.print('headerBuffer');
			hierarchy.push(tmp);
		}
		header.hierarchy=hierarchy;
	}
	
	this.webSocket.write(JSON.stringify(header));
};

AssetManager.prototype.sendAsset = function(){
	if(this.properties.lenth === 0){
		messageDelivery('warning','AssetManager', 'sendAsset', 'No asset to send', this.webSocket);
		return;
	}
	if(this.launched){
		messageDelivery('warning','AssetManager', 'sendAsset', 'Stream is already launched', this.webSocket);
		return;
	}
	var infoAsset = JSON.parse(JSON.stringify(this.info));
	infoAsset._i = 'ai';
	this.webSocket.write(JSON.stringify(infoAsset));
	this.sendHeader();
	this.sendData();
	this.launched=true;
};

AssetManager.prototype.dataSent = function(attributeTypeSent, res){
	if(res===0){ //That means the primitives have not done permutation. So let's send the next data
		this.sendHeader();
		this.sendData();
	}
	else if (res === 1){ //That means the primitive ending a complet permutation. In other word, primitives have done to transfert a kind of data
		//  (ex: all 'POSITIONS' have been transfert). So depending on the behavior of the asset, we need to:
		if (this.behavior.display === 'DEFAULT'){ // - Permute the properties
			//We don't want to permute if we sent 'indices' because that draw nothing
			if (attributeTypeSent!=='indices'){ 
				var prop = this.properties.shift();
				this.properties.push(prop);
			}
		}
		else if (this.behavior.display === 'ONEAFTERONE'){ // - Do nothing and finish to transfert our current property
			
		}
		else{
			/*New behaviors go here*/
		}
		this.sendHeader();
		this.sendData();
	}
};

AssetManager.prototype.allAnimationSent = function(){
	if (this.behavior.extra.indexOf('ANIM_IN_FIRST')>=0){ //permut mesh to display next animation
		var prop = this.properties.shift();
		this.properties.push(prop);
	}
	else{ //
	}
	this.sendHeader();  
	this.sendData();
};
AssetManager.prototype.attributeAnimationSent = function(){
	this.sendHeader();
	this.sendData();
};

AssetManager.prototype.allPrimitivesSent = function(){
	if (this.behavior.extra.indexOf('ANIM_IN_LAST')>=0){ //permut mesh to display next primitives
		var prop = this.properties.shift();
		this.properties.push(prop);
	}
	else{ //
	}
	this.sendHeader();  
	this.sendData();
};

AssetManager.prototype.primitiveSent = function(){

	this.sendHeader();
	this.sendData();
};

AssetManager.prototype.meshSent = function(){

	if(VERBOSE){
		console.log('    ' + this.properties[0].propertyID + ' Sent');
	}
	this.properties.shift();

	if(this.properties.length === 0){
		if(VERBOSE){
			console.log('--------------------------- TRANSFERT COMPLETED ---------------------------');
		}
		this.webSocket.write(JSON.stringify({_i:'sc', message: ''}));
		this.launched = false;
		return;
	}
	this.sendHeader();
	this.sendData();
};

AssetManager.prototype.openAsset = function (path){
   
	if(Path.extname(path)!=='.gltf'){
		messageDelivery('error',path, 'AssetManager.openAsset', 
						'Can not open something else than gltf file', this.webSocket);
	}
	var dataURL = Url.parse(path);

	if(dataURL.protocol==='file:'){
		path = dataURL.path;
		if(/^win/.test(process.platform) && path[0]==='/'){
            path = path.substring(1,path.length);
		}
		this.path = Path.dirname(path);
	}
	else if (dataURL.protocol===null){
		path = Path.join(process.cwd(), path);

		this.path = Path.dirname(path); 
	}
	else if (dataURL.protocol==='http:'){
		/*TODO*/
		messageDelivery('error',dataURL, 'AssetManager.openAsset', 
						'http protocol is not supported for the moment', this.webSocket);
	}
	else{
		messageDelivery('error',dataURL, 'AssetManager.openAsset', 
						dataURL.protocol +' protocol is not supported for the moment', this.webSocket);
	}

	try {var gltfAsset = fs.readFileSync(path, 'utf8');}
	catch (e){
		messageDelivery('error', path, 'AssetManager.openAsset', e, this.webSocket);
	}
	gltfAsset = JSON.parse(gltfAsset);

	if (VERBOSE){
		console.log('gltfAsset read from:' + path);
	}
	return gltfAsset;
};


AssetManager.prototype.getInfoFromAccessor = function (accessorName, gltfFile){
	var currentAccessor = gltfFile.accessors[accessorName];
	var bufferViewID 	= currentAccessor.bufferView;
	var currentBuffer 	= gltfFile.bufferViews[bufferViewID];

	var bufferID		= currentBuffer.buffer;
	var bufferOffset 	= Number(currentBuffer.byteOffset);
	//Note we don't care about optional argument (target, bytelength, extention, extra...)

	var info = { offset 		: currentAccessor.byteOffset + bufferOffset,
				 byteStride		: currentAccessor.byteStride,
				 componentType 	: currentAccessor.componentType,
				 count 			: currentAccessor.count,
				 type 			: currentAccessor.type,
				 min 			: currentAccessor.min,
				 max			: currentAccessor.max,
				 path 			: Path.join(this.path, gltfFile.buffers[bufferID].uri) };
	return info;
};

AssetManager.prototype.getInfoFromCamera = function (cameraName, gltfFile){
	var camera = gltfFile.cameras[cameraName];
	// if (camera.name){
	// 	delete camera.name;
	// }
	return camera;
};

AssetManager.prototype.getInfoFromTexture = function (textureName, gltfFile){

	var currentTexture = JSON.parse(JSON.stringify(gltfFile.textures[textureName]));

	if(currentTexture.format===undefined || currentTexture.format!==6408){
		messageDelivery('warning',currentTexture.source, 'AssetManager.parseGltf', 'We only support RGBA textures for the moment', this.webSocket);
	}
	if(currentTexture.internalFormat===undefined || currentTexture.internalFormat!== 6408){
		messageDelivery('warning',currentTexture.source, 'AssetManager.parseGltf', 'We only support RGBA textures for the moment', this.webSocket);
	}
	if(currentTexture.target===undefined || currentTexture.target!==3553){
		messageDelivery('warning',currentTexture.source, 'AssetManager.parseGltf', 'We only support TEXTURE_2D for the moment', this.webSocket);
	}
	var image 				= gltfFile.images[currentTexture.source];
	var sampler 			= gltfFile.samplers[currentTexture.sampler];

	currentTexture.sampler 	= sampler;
	currentTexture.textureName 	= textureName;
	currentTexture.path 	= createRelativeURL(this.basePath, this.path, image.uri);
	return currentTexture;
};

AssetManager.prototype.getInfoFromSkin = function (skinName, gltfFile){
	var currentSkin = gltfFile.skins[skinName];
	var skinInfo = this.getInfoFromAccessor(currentSkin.inverseBindMatrices, gltfFile);
	skinInfo.jointNames = currentSkin.jointNames.slice(0);
	if (currentSkin.bindShapeMatrix) {
		skinInfo.bindShapeMatrix = currentSkin.bindShapeMatrix.slice(0);
	}
	if (currentSkin.name) {
		skinInfo.name = currentSkin.name;
	}
	//ADD EXTRA + EXTENSIONS ?
	return skinInfo;
};

AssetManager.prototype.setbasePath = function (basePath){
	this.basePath = basePath;
};


AssetManager.prototype.findMesh = function (meshID){
	return this.properties.find(function(elt){return elt.propertyID === meshID;});
};


AssetManager.prototype.parseGltf = function (gltfFile){

	if(VERBOSE){
		console.log('parsing in progress');

	}

	var i,j,k,l;
	var skinInfo;

//////////// PARSE INFO ////////////
	this.info = gltfFile.asset;

//////////// PARSE MESHES ////////////
	if (gltfFile.meshes !== undefined){
		var warn = 0;
		var keyMesh=Object.keys(gltfFile.meshes);

		for (i=0; i<keyMesh.length; i++){
			var currentMesh = gltfFile.meshes[keyMesh[i]];
			var meshToSend = new MeshToSend();
			meshToSend.initMeshToSend(this);
			this.addPropertyToSend(keyMesh[i], meshToSend, currentMesh.name);

			//Parse primitives
			for (j=0; j<currentMesh.primitives.length; j++){

				var currentPrimitive = currentMesh.primitives[j];

				var attribToSend = new AttributesToSend();
				//attribToSend.setParent(meshToSend);
				warn = meshToSend.addPrimitiveToSend(j,currentPrimitive.mode,attribToSend);
				if(warn <0){
					messageDelivery('warning', j, 'MeshToSend.addPrimitiveToSend', 
							'Only triangle topologie support is trusty. Your actual mode may affect the client display', this.webSocket);
				}
				//Remember that we merge attributes, indice, materials... in the same array
				var attrib=Object.keys(currentPrimitive);
				for(k=0; k<attrib.length; k++){

					var currentAttribute = currentPrimitive[attrib[k]];
					var data;

					if (attrib[k]==='attributes'){
						var attribDeep=Object.keys(currentAttribute);
						for(l=0; l<attribDeep.length; l++){
							var accessor = currentAttribute[attribDeep[l]];
							var attribInfo = this.getInfoFromAccessor(accessor, gltfFile);
							data = this.dataManager.manage(attribDeep[l], attribInfo);
							if (data === -1){ 
								messageDelivery('warning', attribDeep[l], 'AttributesToSend.addDataToSend',
												'This kind of attribute is not supported', this.webSocket);
							}
							else {
								attribToSend.addDataToSend(attribDeep[l], data);
							}
						}
					}
					//Note: except if it asked by the client. We will not send indices

					else if (attrib[k]==='indices' && this.behavior.extra.indexOf('INDICES')>-1 ){
						var indiceInfo = this.getInfoFromAccessor(currentAttribute, gltfFile);
						data = this.dataManager.manage(attrib[k], indiceInfo);
						attribToSend.addDataToSend(attrib[k], data);
					}

					else if (attrib[k]==='material' ){
						//we store our material in a dataToSend
						var materialInfo 	= gltfFile.materials[currentAttribute];
						//materialInfo.name 	= materialInfo.name===undefined ? currentAttribute:materialInfo.name;
						materialInfo.name 	= currentAttribute;
						data = this.dataManager.manage(attrib[k], materialInfo);
						attribToSend.addDataToSend(attrib[k], data);

						//And then we store our Textures in a dataToSend
						var key = Object.keys(materialInfo.values);

						for ( var m=0; m<key.length; m++){

							var value = materialInfo.values[key[m]];
							//If a value is a string, that mean it's a texture
							if(typeof value === 'string'){
								var infoTexture = this.getInfoFromTexture(value, gltfFile);
								data = this.dataManager.manage('TEXTURE', infoTexture);
								attribToSend.addDataToSend('TEXTURE', data);
							}
						}
					}
					else if (attrib[k]==='mode'){ //we don't send it beacause we will not support it in the client side anyway.
						if (currentAttribute !== 4){ 
							messageDelivery('error', attrib[k], 'AttributesToSend.addDataToSend',
												'Only triangle topologie are supported by Three.js', this.webSocket);
						}
					}
					else{
						messageDelivery('warning', attrib[k], 'AttributesToSend.addDataToSend',
												'This kind of attribute is not supported', this.webSocket);
					}
				}
			}
		}
	}

//////////// PARSE CAMERAS ////////////
	if (gltfFile.cameras !== undefined){
		var keyCamera=Object.keys(gltfFile.cameras);
		for (i=0; i<keyCamera.length; i++){
			//currentCamera = gltfFile.cameras[keyCamera[i]];

			var cameraInfo = this.getInfoFromCamera(keyCamera[i], gltfFile);
			var cameraToSend = new AttributesToSend();
			//cameraToSend.setParent(this);

			this.addPropertyToSend(keyCamera[i],cameraToSend,cameraInfo.name);

			//var cameraInfo = getInfoFromCamera(currentCamera);
			data = this.dataManager.manage('camera', cameraInfo);
			if (data === -1){ 
				messageDelivery('warning', 'camera', 'AttributesToSend.addDataToSend',
								'Error on managing', this.webSocket);
			}
			else {
				cameraToSend.addDataToSend('camera', data);
			}
		}
	}

//////////// PARSE SKINS //////////// 
/* 	A skin will be considered as a data and stored as AttributesToSend to his meshes.
	But this bind operation can't be done here beacause we don't know his owner(s).
	Thus for the moment we only create the data, and store it in a dictionary to 
	bind it when we will parse the node hierarchy. */
	if (gltfFile.skins !== undefined){
		var skinsToBind = {};
		var skinKeys = Object.keys(gltfFile.skins);

		for (i=0;i<skinKeys.length; i++){
			
			skinInfo = this.getInfoFromSkin(skinKeys[i], gltfFile);
			var skinData = this.dataManager.manage('skin', skinInfo);
			skinsToBind[skinKeys[i]]=skinData;
		}
	}

//////////// PARSE ANIMATION ////////////
/*Like skin, animations are parsed and linked as AttributesToSend to a mesh.
Animations are stored in dictionary where keys are node id to bind. 
Each value contain {animTosend, animName} */
	if (gltfFile.animations !== undefined){
		var animationsToBind = {}; 
		var animationKeys = Object.keys(gltfFile.animations);

		for(i=0; i<animationKeys.length; i++){
			var currentAnimation = gltfFile.animations[animationKeys[i]];
			var parametersToBind = {}; //used to keep link between parameters name and his accessor
			var parameterKeys;
			//First we extract parameters info and dataToSend
			if (currentAnimation.parameters !== undefined){
				
				parameterKeys = Object.keys(currentAnimation.parameters);
				for (j=0; j<parameterKeys.length; j++){
					var parameterInfo = this.getInfoFromAccessor(currentAnimation.parameters[parameterKeys[j]], gltfFile);
					var parameterData = this.dataManager.manage('animationParameter', parameterInfo);
					parametersToBind[parameterKeys[j]] = parameterData;
				}
			}

			//Then we extract channels info and dataToSend
			if (currentAnimation.channels !== undefined){
				for (j=0; j<currentAnimation.channels.length; j++){
					var currentChannel = currentAnimation.channels[j];
					var currentSampler = currentAnimation.samplers[currentChannel.sampler];

					var channelInfo = { inputGUID 		: parametersToBind[currentSampler.input].info.guid,
										interpolation 	: currentSampler.interpolation,
										outputGUID 		: parametersToBind[currentSampler.output].info.guid,
										path 			: currentChannel.target.path,
										target 			: currentChannel.target.id };
					var channelData = this.dataManager.manage('animationChannel', channelInfo);

					//Now we add parameters and channel datas to our animationToBind
					if (animationsToBind[currentChannel.target.id] === undefined){
						animationsToBind[currentChannel.target.id] = { 	animToSend 	: new AttributesToSend(),
																		animName 	: animationKeys[i] };
					}
					var animationToSend = animationsToBind[currentChannel.target.id].animToSend;
					animationToSend.addDataToSend('Anim_Channel_'+currentChannel.target.path, channelData);
					for (k=0; k<parameterKeys.length; k++){
						animationToSend.addDataToSend('Anim_Param_'+parameterKeys[k], parametersToBind[parameterKeys[k]]);
					}
				}
			}
		}
	}


//////////// PARSE NODES //////////// 
	if (gltfFile.nodes !== undefined){
		var keyNode=Object.keys(gltfFile.nodes);
		var nodeID;
		var isSkinned;
		//First loop is to create all our nodes
		for (i = 0; i < keyNode.length; i++) {
			nodeID = keyNode[i];
			var newNode = new NodeHierarchy();
			newNode.info.id = nodeID;
			newNode.info.fill(gltfFile.nodes[nodeID]);
			isSkinned = false;

			//Now we add this node to our dictionaries
			this.nodeManager.addNode(newNode, nodeID, 'node');

			if(newNode.info.skin !== undefined){
				this.nodeManager.addNode(newNode, newNode.info.skin, 'skin');
				isSkinned = true;
			}
			if(newNode.info.camera !== undefined){
				this.nodeManager.addNode(newNode, newNode.info.camera, 'camera');
			}
			if(newNode.info.jointName !== undefined){
				this.nodeManager.addNode(newNode, newNode.info.jointName, 'jointName');
			}
			// if(newNode.info.skeletons !== undefined){ /*TO THINK*/
			// 	for (j = 0; j < newNode.info.skeletons.length; j++) {
			// 		this.nodeManager.addNode(newNode, newNode.info.skeletons[j], 'jointName'); 
			// 	}
			// }
			if(newNode.info.meshes !== undefined){ 

				for (j = 0; j < newNode.info.meshes.length; j++) {
					this.nodeManager.addNode(newNode, newNode.info.meshes[j], 'mesh');
					var meshToBind = this.findMesh(newNode.info.meshes[j]);

					var currentAnim = animationsToBind[newNode.info.id];

					if (currentAnim !== undefined){ //this node have an annimation so add it as a property of this mesh
						
						meshToBind.property.addAnimationToSend(currentAnim.animName, 'anim', currentAnim.animToSend);
					}

					if (isSkinned){
						//Bind skeleton
						var newSkin = new AttributesToSend();
						skinInfo = skinsToBind[newNode.info.skin];
						newSkin.addDataToSend('skin', skinInfo );

						meshToBind.isSkinned = true;
						//newSkin.setParent(meshToBind);
						meshToBind.property.addAnimationToSend(newNode.info.skin,'skin', newSkin);

						//Bind Animation
						for (k=0; k<skinInfo.info.jointNames.length; k++){
							currentAnim = animationsToBind[skinInfo.info.jointNames[k]];
							if (currentAnim !== undefined){ //this bone have an annimation so add it as a property of this mesh
								meshToBind.property.addAnimationToSend(currentAnim.animName, 'anim', currentAnim.animToSend);
							}
						}
					}
				}
			}
		}
		//Second loop is to link all our nodes created
		for (i = 0; i < keyNode.length; i++) {
			nodeID = keyNode[i];
			var currentJSONnode = gltfFile.nodes[nodeID];
			if (currentJSONnode.children === undefined){ //nothing to link
				continue;
			}
			var currentNode = this.nodeManager.getNodes(nodeID,'node')[0];

			for (j = 0; j<currentJSONnode.children.length; j++){
				
				var nodeChildren = this.nodeManager.getNodes(currentJSONnode.children[j],'node')[0];
				//now we bind parent and children arrays
				currentNode.children.push(nodeChildren);
				nodeChildren.parent.push(currentNode);
			}
		}
	}

};

AssetManager.prototype.feedbackManager = function (data){
	try {var fb = JSON.parse(data);}
	catch (e){
		messageDelivery('error', 'AssetManager', 'feedbackManager', 'Feedback received is not JSON type', this.webSocket);
	}
	if(VERBOSE){
		console.log(fb);
	}
	
	if(fb._i === 'ar'){ //Asset required
		this.emit('loadAsset', fb.url);
	}
	else if (fb._i ==='sr'){ //Sorting required
		this.emit('sortingRequired', fb.behavior);
	}
	else if(fb._i === 'cc'){
		messageDelivery('warning','AssetManager', 'feedbackManager', 'Sorting data depending the camera position is not supported for the moment', this.webSocket);
	}

	else{
		messageDelivery('warning','AssetManager', 'feedbackManager', fb.name+' '+fb._i+' is not supported', this.webSocket);
	}
};

exports.assetManager = function (){ return new AssetManager();};

exports.setVerbose = function(bool){VERBOSE = bool;}
