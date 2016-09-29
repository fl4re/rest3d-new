/* 
	Rest3d_client is an API to store a glTF stream into a Three.js client
	@author: Selim Bekkar - selim.bekkar_at_gmail.com
	Starbreeze - Augut 2016 - v0.1.3

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

THREE.glTFInterpolator.prototype.setGUID = function (inputGUID, outputGUID){
	this.inputGUID 	= inputGUID;
	this.outputGUID = outputGUID;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////// TOOL BOX /////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var convertWebglEnumToThreejsEnum = function (type){
	switch(type){
		/* DataType */
	    case 0x1400 : // const GLenum BYTE
	    	return THREE.ByteType;
	    case 0x1401 : // const GLenum UNSIGNED_BYTE
	    	return THREE.UnsignedByteType;
	    case 0x1402 : // const GLenum SHORT
	    	return THREE.ShortType;
	    case 0x1403 : //const GLenum UNSIGNED_SHORT
	    	return THREE.UnsignedShortType;
	    case 0x1404 : // const GLenum INT
	    	return THREE.UnsignedShortType;
	    case 0x1405 : // const GLenum UNSIGNED_INT
	    	return THREE.UnsignedIntType;
	    case 0x1406 : // const GLenum FLOAT
	    	return THREE.FloatType;
	    //case ?? :
	    //	return THREE.HalfFloatType;

		/* PixelFormat */
		case 0x1902 : // const GLenum DEPTH_COMPONENT    
			return THREE.DepthFormat;
		case 0x1906 : // const GLenum ALPHA
			return THREE.AlphaFormat;
        case 0x1907 : // const GLenum RGB
        	return THREE.RGBFormat;
        case 0x1908 : // const GLenum RGBA
        	return THREE.RGBAFormat;
        case 0x1909 : // const GLenum LUMINANCE 
        	return THREE.LuminanceFormat;
        case 0x190A : // const GLenum LUMINANCE_ALPHA
        	return THREE.LuminanceAlphaFormat;
        //case ?? :
        //	return THREE.RGBEFormat;

        /* PixelType */
	    case 0x8033 : // const GLenum UNSIGNED_SHORT_4_4_4_4
	    	return THREE.UnsignedShort4444Type;
	    case 0x8034 : // const GLenum UNSIGNED_SHORT_5_5_5_1
	    	return THREE.UnsignedShort5551Type;
	    case 0x8363 : // const GLenum UNSIGNED_SHORT_5_6_5
	    	return THREE.UnsignedShort565Type;

        /* TextureMagFilter */
        case 0x2600 : // const GLenum NEAREST
        	return THREE.NearestFilter;
		case 0x2601 : // const GLenum LINEAR
			 return THREE.LinearFilter;

		/* TextureMinFilter */
		case 0x2700 : // const GLenum NEAREST_MIPMAP_NEAREST
			return THREE.NearestMipMapNearestFilter;
    	case 0x2701 : // const GLenum LINEAR_MIPMAP_NEAREST 
    		return THREE.LinearMipMapNearestFilter;
      	case 0x2702 : // const GLenum NEAREST_MIPMAP_LINEAR
      		return THREE.NearestMipMapLinearFilter;
       	case 0x2703 : // const GLenum LINEAR_MIPMAP_LINEAR
       		return THREE.LinearMipMapLinearFilter;

       	/* TextureParameterName */
	    // case 0x2800 : // const GLenum TEXTURE_MAG_FILTER
	    // 	return THREE.;
	    // case 0x2801 : // const GLenum TEXTURE_MIN_FILTER
	    // 	return THREE.;
	    // case 0x2802 : // const GLenum TEXTURE_WRAP_S
	    // 	return THREE.;
	    // case 0x2803 : // const GLenum TEXTURE_WRAP_T
	    // 	return THREE.;

	    /* TextureWrapMode */
		case 0x2901 : // const GLenum REPEAT
			return THREE.RepeatWrapping;
	    case 0x812F : // const GLenum CLAMP_TO_EDGE
	    	return THREE.ClampToEdgeWrapping;
	    case 0x8370 : // const GLenum MIRRORED_REPEAT
	    	return THREE.MirroredRepeatWrapping;

	    default: //Other enums don't have a direct link with Threejs enums
	    	console.error(type+' can not be converted to Threejs type');
	    	return;
	}
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
			console.error('In getSizeOfType: '+type+' unknow');
	}
};

var getSizeOfComponentType = function (type) {
	switch (type) {
		case 5120: //BYTE
			return 1;
		case 5121: //UNSIGNED_BYTE
			return 1;
		case 5122: //SHORT
			return 2;
		case 5123: //UNSIGNED_SHORT
			return 2;
		case 5124: //INT
			return 2;
		case 5125: //UNSIGNED_INT
			return 2;
		case 5126: //FLOAT
			return 4;
		default :
			console.error('In getSizeOfComponentType: '+type+' unknow');
	}
};

var allocateTypedArray = function(type, size){
	switch (type){
		case 5120:
			var resultArray = new Int8Array(size);
			break;
		case 5121:
			var resultArray = new Uint8Array(size);
			break;
		case 5122:
			var resultArray = new Int16Array(size);
			break;
		case 5123:
			var resultArray = new Uint16Array(size);
			break;
		case 5126:
			var resultArray = new Float32Array(size);
			break;
		default :
		 console.error('In allocateTypedArray: '+type+' unknow');
	}
	return resultArray;
};

// Return a typedArray with size(resultArray) = size(buffer1) + size(buffer2)
// var mergeBuffers = function (buffer1, buffer2, type){
// 	if(buffer1.name !== buffer2.name){
// 		console.error('The buffers must have the same type');
// 	}
// 	var resultArray = allocateTypedArray(type, buffer1.length + buffer2.length);

// 	resultArray.set(buffer1);
// 	resultArray.set(buffer2, buffer1.length);

// 	return resultArray;
// };

var Uint8ToFloat32Array = function(buffer, littleIndian) {
	
    var dataUint8 = new DataView(buffer.buffer);
    var buf = new ArrayBuffer(dataUint8.byteLength);
    var dataFloat32 = new Float32Array(buf);
    var j = 0;
    for (var i = 0; i < dataUint8.byteLength-3; i=i+4) {
        dataFloat32[j] = dataUint8.getFloat32(i, littleIndian);
        j++;
    }
    return dataFloat32;
};

var Uint8ToUint16Array = function(buffer, littleIndian) {
	
    var dataUint8 = new DataView(buffer.buffer);
    var buf = new ArrayBuffer(dataUint8.byteLength);
    var dataUint16 = new Uint16Array(buf);
    var j = 0;
    for (var i = 0; i < dataUint8.byteLength-1; i=i+2) {
        dataUint16[j] = dataUint8.getUint16(i, littleIndian);
        j++;
    }
    return dataUint16;
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////// DATA MANAGER ///////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function DataReceivedManager(parent){
	this.parent 		= parent;
	this.url 			= '';
	this.currentData 	= {};
	this.sizeReceived 	= 0;
	this.dataReceived 	= {}; // Our data are store in dictionary as {guid: {data, inProgress, storage, info...} }. A data can be a buffer, a texture or a JSON. 
	//This dictionaries are another view for three.js objects created. It will be more efficient to research something here than to scene hierarchy;
	this.meshes 		= {}; //This can be delet because it's redundant with this.node. But we keep it for more clearness
	this.textures 		= {};
	this.skeletons 		= {};
	this.materials 		= {};
	this.animations 	= {}; 
	this.cameras 		= {}; /*TODO*/
	this.images			= {}; //Here we store the images already downloaded
	this.node 			= {}; //Each element point to a object3d

};

DataReceivedManager.prototype.getInfo = function () {
	var info;
	if (this.currentData === undefined){
		info = { inProgress: false };
	}
	else {
		info = {
			id 				: this.currentData.propertyID,
			name 			: this.currentData.propertyName,
			count			: this.currentData.count,
			type 			: this.currentData.type,
			attribute 		: this.currentData.attribute,
			inProgress 		: this.currentData.inProgress,
			name 			: this.currentData.name,
			sizeReceived 	: this.currentData.sizeReceived ,
			};
	}
	return info;
};

/*This function returns the primitives asked (as an array because primitve can have been duplicated). 
And create it (with the correct hierarchy) if he is not found */
DataReceivedManager.prototype.getPrimitives = function (meshID, meshName, primitiveName){

	if (this.meshes[meshID] === undefined ){
		this.meshes[meshID] 				= new THREE.Object3D();
		this.meshes[meshID].userData.gltfId = meshID;
		this.meshes[meshID].name 			= meshName;
		this.node[meshID] = []; //This is used to build the hierarchy
		this.node[meshID].push(this.meshes[meshID]);
	}

	var primitives = [];
	var meshNodes = this.node[meshID];
	for (var i=0; i<meshNodes.length; i++){
		var prim = meshNodes[i].getObjectByName(primitiveName);
		if (prim!== undefined){
			primitives.push(prim);
		}
	}

	if (primitives.length === 0 ){
		var newGeom 		= new THREE.BufferGeometry();
		var newPrimitive 	= new THREE.Mesh(newGeom,this.parent.defaultMaterial.clone(),false);
		newPrimitive.name 	= primitiveName;
		primitives.push(newPrimitive)
		this.meshes[meshID].add(newPrimitive);
	}

	return primitives;
};

DataReceivedManager.prototype.getTexture = function (textureName){
	if (this.textures[textureName] === undefined){
		this.textures[textureName] = this.parent.defaultTexture;
	}
	return this.textures[textureName];
};

DataReceivedManager.prototype.convertMesh2SkinnedMesh = function (mesh){
	var parent = mesh.parent;
	mesh.parent.remove(mesh);

	mesh.material.skinning 		= true;
	mesh.material.needsUpdate 	= true;

	var newSkinnedPrimitive = new THREE.SkinnedMesh(mesh.geometry, mesh.material);
	newSkinnedPrimitive.frustumCulled 	= false;
	//newSkinnedPrimitive.visible = false;

	parent.add(newSkinnedPrimitive);

	for (var j=0; j<mesh.children.length; j++){
		newSkinnedPrimitive.add(mesh.children[j]);
	}
	return newSkinnedPrimitive;

}

//This function bind a dataBuffer to a BufferGeometry from a mesh primitive 
DataReceivedManager.prototype.bindDataBuffer = function (dataBuffer, info){

	var meshID 		= info.propertyID;
	var primName 	= meshID+'_'+info.primNum;

	dataBuffer.propertyID = meshID;

	var primitives 	= this.getPrimitives(meshID, info.propertyName, primName);
	var that 		= this;
	var meshNodes 	= this.node[meshID]; 

	//Check if he is not already linked. We only need to check the first element beceause other one are duplications.
	if (primitives[0].geometry.getAttribute(dataBuffer.attribute) === undefined ){

		if (dataBuffer.attribute === 'index'){
			var offset = {
				start: 0,
				index: 0,
				count: dataBuffer.data.array.length
			};
			primitives.forEach(function(elt,index,array){
				elt.geometry.groups.push(offset);
				elt.geometry.setIndex(dataBuffer.data);
				elt.visible 		= false; // it's for preventing errors from webGL (in case where positions are not defined)
				elt.frustumCulled 	= false; // TO THINK beacause it's never reactivate => can decrease performances
			});
			
		}

		else{
			primitives.forEach(function(elt,index,array){
				elt.geometry.addAttribute(dataBuffer.attribute, dataBuffer.data);
			});

			if (dataBuffer.attribute === 'position'){
				primitives.forEach(function(elt,index,array){
					if (elt.geometry.groups.length === 0){
						var offset = {
										start: 0,
										index: 0,
										count: dataBuffer.data.array.length
									};
						elt.geometry.groups.push(offset);
					}
					elt.material.shading = THREE.FlatShading;
					elt.visible = true;
					
				});
			}
			else if (dataBuffer.attribute === 'normal'){
				primitives.forEach(function(elt,index,array){
					elt.material.shading = THREE.SmoothShading;
					elt.material.needsUpdate=true;
				});
			}

			else if (dataBuffer.attribute === 'skinWeight' && primitives[0].type === 'Mesh'){ 
					
				primitives.forEach(function(elt,index,array){
					if (elt.parent.userData.needToBeSkinned){
						that.linkSkeleton2Mesh(meshID, meshID);
					}
				});
			}
		}
	}
};

DataReceivedManager.prototype.bindDataTexture = function (dataTexture, info){
	dataTexture.propertyID = info.propertyID;
};


DataReceivedManager.prototype.bindDataCamera = function (dataCamera, info){
	dataCamera.propertyID = info.propertyID;
};

DataReceivedManager.prototype.bindDataAnimation = function (animation, info){
	animation.propertyID = info.propertyID;
};

DataReceivedManager.prototype.bindDataArray = function (dataArray, info){
	dataArray.propertyID = info.propertyID;
};

DataReceivedManager.prototype.bindDataMaterial = function (dataMaterial, info){

	var meshID 		= info.propertyID;
	var primName 	= meshID+'_'+info.primNum;

	dataMaterial.propertyID = info.propertyID;

	var primitives = this.getPrimitives(meshID, info.propertyName, primName);
	primitives.forEach(function(elt,index,array){
		elt.material=dataMaterial.data;
	});
};

DataReceivedManager.prototype.linkSkeleton2Mesh = function (skeletonName, meshName){

	var skeleton 	= this.skeletons[skeletonName].skeleton;
	if (skeleton === undefined ){
		console.warn('Skeleton not defined');
	}
	var matrix 		= this.skeletons[skeletonName].bindMatrix;
	var meshNodes 	= this.node[meshName]; 

	//Bind all mesh's primitives, and all their duplications too.
	for (var i=0; i<meshNodes.length; i++){
		for (var j=0; j<meshNodes[i].children.length; j++){
			var currentPrimitive = meshNodes[i].children[j];
			//Convert him if it wasn't done.
			if (currentPrimitive.type !== 'SkinnedMesh'){ 
				currentPrimitive = this.convertMesh2SkinnedMesh(currentPrimitive);
			}
			//Check if he is not already bind
			if (currentPrimitive.skeleton.bones.length === 0){
				currentPrimitive.bind(skeleton, matrix);
				//currentPrimitive.visible = true;
			}
		}
	}

}

DataReceivedManager.prototype.bindDataSkeleton = function (dataSkeleton, info){

	dataSkeleton.propertyID = info.propertyID;
	//First we create all our bones and all them heirarchy
	var bones = [];

	for(var i=0; i<info.jointNames.length; i++){
		var currentJoint = info.jointNames[i];
		var currentBone = this.node[currentJoint.info.id];
		if (currentBone === undefined){
			currentBone 					= new THREE.Bone();
			currentBone.userData.gltfId 	= currentJoint.info.id;
			currentBone.userData.jointName 	= currentJoint.info.jointName;

			if (currentJoint.info.jointName ==='Bip01_L_Hand'){
				console.log('yolo');
			}

			if(currentJoint.info.name !== undefined){
				currentBone.name = info.name; 
			}
			if(currentJoint.info.rotation !== undefined){
				currentBone.quaternion.fromArray(currentJoint.info.rotation);
			}
			if(currentJoint.info.scale !== undefined){
				currentBone.scale.fromArray(currentJoint.info.scale);
			}
			if(currentJoint.info.translation !== undefined){
				currentBone.position.fromArray(currentJoint.info.translation);
			}
			currentBone.updateMatrix();
			currentBone.matrixAutoUpdate = false;
			if(currentJoint.info.matrix !== undefined){ 
				var mat4 = new THREE.Matrix4().fromArray(currentJoint.info.matrix);
				currentBone.applyMatrix(mat4);
			}
			
			this.node[currentJoint.info.id] = [currentBone];
		}

		bones.push(currentBone);
		this.manageHierarchy(currentJoint.parent, currentBone);
	}
/*TO THINK : maybe we will create multiple skeleton with same attribute, beacause skeleton are not saved in disctionary to know if they was already created.
That's beacause we don't have any ID to store it. BTW because bones and bindMatrix are not recreated, we considered that as acceptable. */
	var boneInverses = undefined;

	var newSkeleton 	= new THREE.Skeleton(bones, dataSkeleton.data, false);

	var matriceArray 	= info.bindShapeMatrix===undefined ? [1.,0.,0.,0.,0.,1.,0.,0.,0.,0.,1.,0.,0.,0.,0.,1.] : info.bindShapeMatrix;
	var bindMatrix 		= new THREE.Matrix4().fromArray(matriceArray);

	var meshID 		= info.propertyID;
	
	this.skeletons[info.propertyID] = {	skeleton 	: newSkeleton,
										bindMatrix 	: bindMatrix }; //We don't link skeleton, mesh and matrix now but when data will be fully downloaded

	var meshNodes 	= this.node[meshID]; 
	if (meshNodes === undefined){ //happens if for exemple we receive a skeleton before the mesh (for 'ANIM_IN_FIRST')
		var newMeshNode 			= new THREE.Object3D();
		newMeshNode.userData.gltfId = meshID;
		this.meshes[meshID] 		= newMeshNode;
		meshNodes 					= [newMeshNode];
		this.node[meshID] 			= meshNodes;
	}

	this.meshes[meshID].userData.needToBeSkinned = true; 
	//this.linkSkeleton2Mesh(meshID, meshID);
	

};

DataReceivedManager.prototype.createDataArray = function (info){
	var size_n = getSizeOfType(info.type);
	var typedArray = allocateTypedArray(info.componentType, info.count*size_n);

	var newData = { guid 			: info.guid,
					data 			: typedArray,
					sizeReceived 	: 0,
					byteStride 		: info.byteStride,
					componentType 	: info.componentType,
					count 			: info.count*size_n,
					type 			: info.type,
					attribute 		: info.attribute,
					inProgress 		: true,
					linkedTo 		: [], //an array to know to which animations this array is bound. 
					storage 		: new Uint8Array(0) };

	this.currentData = newData;
	this.dataReceived[info.guid] = newData;
};

DataReceivedManager.prototype.createDataBuffer = function (info){

	var attrib = '';
	switch (info.attribute){
		case 'POSITION':
			attrib = 'position';
			break;
		case 'NORMAL':
			attrib = 'normal';
			break;
		case 'TEXCOORD_0':
			attrib = 'uv';
			break;
		case 'indices':
			attrib = 'index';
			break;
		case 'JOINT':
			attrib = 'skinIndex';
			break;
		case 'WEIGHT':
			attrib = 'skinWeight';
			break;
		/*TODO*/
		default :
			console.warn('In createDataBuffer: '+info.attribute+' is not supported');
	}

	var size_n = getSizeOfType(info.type);
	var typedArray = allocateTypedArray(info.componentType, info.count*size_n) ;
	typedArray.fill(Infinity);
	var newTopo = new THREE.BufferAttribute(typedArray, size_n);

	var newData = { guid 			: info.guid,
					data 			: newTopo,
					sizeReceived 	: 0,
					byteStride 		: info.byteStride,
					componentType 	: info.componentType,
					count 			: info.count*size_n,
					type 			: info.type,
					attribute 		: attrib,
					inProgress 		: true,
					storage 		: new Uint8Array(0) };

	this.currentData = newData;
	this.dataReceived[info.guid] = newData;

};

DataReceivedManager.prototype.createDataTexture = function (info){

	var image = this.images[info.source];
	if (image === undefined ){
		image = this.parent.defaultImage;
	}

	var newData = { guid 			: info.guid,
					sizeReceived 	: 0,
					format 			: convertWebglEnumToThreejsEnum(info.format),
					internalFormat	: convertWebglEnumToThreejsEnum(info.internalFormat),
					name 			: info.textureName,
					type 			: convertWebglEnumToThreejsEnum(info.type),
					attribute 		: 'texture',
					inProgress 		: true,
					source 			: info.source,
					magFilter 		: convertWebglEnumToThreejsEnum(info.sampler.magFilter),
					minFilter 		: convertWebglEnumToThreejsEnum(info.sampler.minFilter),
					wrapS 			: convertWebglEnumToThreejsEnum(info.sampler.wrapS),
					wrapT 			: convertWebglEnumToThreejsEnum(info.sampler.wrapT),
					target 			: info.target };

	var newTexture = new THREE.Texture(image, THREE.Texture.DEFAULT_MAPPING, newData.wrapS, newData.wrapT,
										newData.magFilter, newData.minFilter, newData.format, newData.type, 
										undefined, undefined );
	newTexture.flipY = false;
	newData.data = newTexture;
	this.textures[info.textureName] = newTexture;
	this.currentData 				= newData;
	this.dataReceived[info.guid] 	= newData; 
};

DataReceivedManager.prototype.createDataMaterial = function (info){
	/*TO DO: add other material*/

	var newMaterial = new THREE.MeshStandardMaterial( { color: 0xFFFFFF , roughness: 0.8, metalness: 0.25, envMap: this.parent.envMap} );
	//var newMaterial = new THREE.MeshStandardMaterial( { color: colorWhileStreaming , roughness: 0.1, metalness: 0.8, envMap: this.envMap} );
	newMaterial.previousMaterial = null; //We add a new attribute to material for the display functionalities

	var newData = { guid 		: info.guid,
					data 		: newMaterial,
					attribute 	: 'material',
					name 		: info.name,
					inProgress 	: false };

	this.materials[newData.name]= newData.data;
	this.currentData 			= newData;
	this.dataReceived[info.guid]= newData; 
};

DataReceivedManager.prototype.createDataCamera = function (info){
	var newCamera;
	if (info.type==='perspective'){
		newCamera = new THREE.PerspectiveCamera(info.perspective.yfov, info.perspective.aspectRatio, info.perspective.znear, info.perspective.zfar);
	}
	else if (info.type==='orthographic'){
		newCamera = new THREE.OrthographicCamera( window.innerWidth/-2, window.innerWidth/2, window.innerHeight/2 , window.innerHeight/- 2, 
													info.orthographic.znear, info.orthographic.zfar );
	}
	else {
		console.warn(info.type +'is not supported (because not planned by gltf 1.0)');
		return;
	}
	newCamera.name 				= info.propertyName;
	newCamera.userData.gltfId 	= info.propertyID;

	var newData = { guid 		: info.guid,
					data 		: newCamera,
					attribute 	: 'camera',
					name 		: info.propertyName,
					inProgress 	: true };
	this.cameras[info.propertyID]	= newData.data;
	this.node[info.propertyID] 		= []; //This is used to build the hierarchy
	this.node[info.propertyID].push(newData.data);
	this.currentData 				= newData;
	this.dataReceived[info.guid]	= newData; 
};

DataReceivedManager.prototype.createDataSkeleton = function (info){

	var boneInverses = [];
	for (i=0; i<info.count; i++){
		var matTmp = new THREE.Matrix4();
		boneInverses.push(matTmp);
	}
	var newData = { guid 			: info.guid,
					data 			: boneInverses,
					sizeReceived 	: 0,
					componentType 	: info.componentType,
					count 			: info.count*getSizeOfType(info.type),
					type 			: info.type,
					attribute 		: 'skin',
					inProgress 		: true,
					storage 		: new Uint8Array(0) };

	this.currentData 				= newData;
	this.dataReceived[info.guid]	= newData;
};


DataReceivedManager.prototype.createAnimation = function (info){
	var keys 	= this.dataReceived[info.inputGUID];
	var values 	= this.dataReceived[info.outputGUID];
	var target 	= this.node[info.target]; 

	var animation = this.animations[info.animName];
	if (animation === undefined){
		animation 				= new THREE.glTFAnimation();
		animation.inputGUID 	= info.inputGUID;
		animation.outputGUID 	= info.outputGUID;
		animation.loop 			= true;

		this.animations[info.animName] = animation;
	}

	if(keys !== undefined && values !== undefined && target !== undefined ){

		var minRecieved = Math.min(values.sizeReceived/getSizeOfType(values.type),keys.sizeReceived);

		var interp = { 	keys : keys.data,
						values : values.data,
						count : minRecieved,
						target : target[0], //TO FIX
						path : info.path,
						type : info.interpolation };

		animation.createInterpolators([interp]);
		//We need to keep data's guid informations in each interp.
		animation.interps[animation.interps.length-1].setGUID(info.inputGUID, info.outputGUID); /*TODO Find a most classy way*/
		//link this animation with data for future update.
		this.dataReceived[info.inputGUID].linkedTo.push(info.animName);
		this.dataReceived[info.outputGUID].linkedTo.push(info.animName);
	}
	else{
		console.warn('Can not create this animation.'+info+'  Send parameters before');
	}
	animation.play();
	animation.startTime = this.parent.startTime; //for a value to have the same for everyone

	var newData = { guid 			: info.guid,
					data 			: animation,  
					// sizeReceived 	: 0, TO THINK
					 attribute 		: 'animation',
					 name 			: info.animName, 
					 inProgress 	: true
				};
	this.currentData 				= newData;
	this.dataReceived[info.guid]	= newData;
};


DataReceivedManager.prototype.updateAnimation = function (animationName, dataGUID){
	var anim = this.animations[animationName];

	for (var i=0; i<anim.interps.length; i++){
		var currentInterpolator = anim.interps[i];
		if (currentInterpolator.inputGUID === dataGUID || currentInterpolator.outputGUID === dataGUID){ //this interpolateur need to be updated
			var keys 	= this.dataReceived[currentInterpolator.inputGUID];
			var values 	= this.dataReceived[currentInterpolator.outputGUID];

			var minRecieved = Math.min(values.sizeReceived/getSizeOfType(values.type),keys.sizeReceived);
			currentInterpolator.count = minRecieved;
			currentInterpolator.duration = currentInterpolator.keys[minRecieved - 1];
			anim.duration = Math.max(anim.duration, currentInterpolator.duration); //we always add more data thus duration can only increase
		}
	}
};


DataReceivedManager.prototype.createNode = function (info){

	var newNode;
	if(info.jointName !== undefined){
		newNode 					= new THREE.Bone();
		newNode.userData.jointName 	= info.jointName;
	}
	else {
		newNode = new THREE.Object3D();
	}

	newNode.userData.gltfId = info.id;
	newNode.matrixAutoUpdate = false;

	if(info.name !== undefined){
		newNode.name = info.name; 
	}
	if(info.rotation !== undefined){
		newNode.quaternion.fromArray(info.rotation);
	}
	if(info.scale !== undefined){
		newNode.scale.fromArray(info.scale);
	}
	if(info.translation !== undefined){
		newNode.position.fromArray(info.translation);
	}
	newNode.updateMatrix();
	newNode.matrixAutoUpdate = false;
	if(info.matrix !== undefined){ 
		var mat4 = new THREE.Matrix4().fromArray(info.matrix);
		newNode.applyMatrix(mat4);
	}
	if(this.node[info.id] === undefined){
		this.node[info.id] = [];
	}
	this.node[info.id].push(newNode);
	return newNode;
};

DataReceivedManager.prototype.manageHierarchy = function(hierarchy, node){
/*By the fact that glTF spec hierarchy may be improved to a directed acyclic graph, we will solve this like if it was one.
Who can do more can do less... Thus we need to tranform a acyclic graph into a tree*/
/*We will broke every multiple parents node by duplicating branches. 

	Thus :

	(...)   (...)             (...)       (...) 
	   \     /                  |           |
		A   B  (...)            A           B        (...)   
		 \ /   /                |           |          |
		  C   F       =>        C           C'         F
		 / \ /                 / \         / \         |
		D   E                 D   E       D'  E'      E''
		\   /                 |   |       |   |        |
		mesh1                m1   m1'    m1'' m1'''  m''''

Meshes are not considered as a node in glTF spec. That why this graph still acyclic. But for threejs, a mesh is a node ! 
Thus this probleme become to convert a ciclyc graph into tree. 
Important things to remember: we built our tree from leaf to root, and all the parent hierarchy of a node is sent in one time. 
So when we receive mesh1 hierarchy, we are sure to have all informations to build/connect him to his whole tree.
*/
/* Structur: Each node is now link with a list that hold all his duplication.
Thus in the diagram above, m1 m1' m1'' m1''' and m1'''' will be regroup in this.node[m1.id][].
*/
	if (hierarchy === undefined){ //nothing to connect or already connected
		return;
	}

	if (hierarchy.length === 0) { //it's a root, so connect it to THREE.scene
		this.parent.threejsScene.add(node) ;
	}

	var parentID;
	var currentID = node.userData.gltfId;
	var currentNodes = this.node[currentID];
	var parentNodes;
	var i;

	if(hierarchy.length>1){ //Our node have more than one parent =>clone it and add it to his list
		for (i=1; i<hierarchy.length; i++){
			currentNodes.push(node.clone());
		}
	}

	//Now we bind
	for (i=0; i<hierarchy.length; i++){
		parentID = hierarchy[i].info.id;
		parentNodes = this.node[parentID];

		if(parentNodes === undefined ){ //It's the first time we meet this node
			parentNodes = this.createNode(hierarchy[i].info);
			parentNodes.add(currentNodes[i]);
			this.manageHierarchy(hierarchy[i].parent, parentNodes);
		}

		else {//It was a node previously meet, we need to clone and conect our current node for each duplication of the parent node
			for (var j = 1; j<parentNodes.length; j++){ 
				currentNodes.push(node.clone()); 
			}
			for (j=0; j<parentNodes.length; j++){
				parentNodes[j].add(currentNodes[hierarchy.length+j-1]);
			}
		}
	}
};

DataReceivedManager.prototype.manageData= function (info){
	var nature 		 = info._i;
	this.currentData = this.dataReceived[info.guid];

	if (this.currentData === undefined){
		switch(nature){
			case 'bi':
				if (info.attribute.indexOf('Anim_Param')===0){
					this.createDataArray(info);
				}
				else{
					this.createDataBuffer(info);
				}
				break;
			case 'ti':
				this.createDataTexture(info);  
				break;
			case 'mi':
				this.createDataMaterial(info);
				break;
			case 'ci':
				this.createDataCamera(info);
				break;
			case 'si':
				this.createDataSkeleton(info);
				break;
			case 'aci':
				this.createAnimation(info);
				break;
			default:
				console.warn('Can not manage this data: '+nature);
				return;
		}
	}

	switch(nature){
		case 'bi':
			if (info.attribute.indexOf('Anim_Param')===0){ //Anim are bind separately
				this.bindDataArray(this.currentData, info);
			}
			else{
				this.bindDataBuffer(this.currentData, info);
				this.manageHierarchy(info.hierarchy, this.meshes[info.propertyID]);
			}
			break;
		case 'ti':
			this.bindDataTexture(this.currentData, info);  
			break;
		case 'mi':
			this.bindDataMaterial(this.currentData, info);
			break;
		case 'ci':
			this.bindDataCamera(this.currentData, info);
			this.manageHierarchy(info.hierarchy, this.cameras[info.propertyID]);
			break;
		case 'si':
			this.bindDataSkeleton(this.currentData, info);
			this.manageHierarchy(info.hierarchy, this.meshes[info.propertyID]); 
			break;
		case 'aci':
			this.bindDataAnimation(this.currentData, info);
			this.manageHierarchy(info.hierarchy, this.meshes[info.propertyID]);
			break;
		default:
			console.warn('Can not manage this data: '+nature);
			return;
	}

};

//Split the received data to be sure they are multiple of size(n) * size(p) before drawing to prevent webgl errors
//Where n = VEC2,VEC3,VEC4... and p = FLOAT32, UINT8...
DataReceivedManager.prototype.splitAndStoreDataOutOfBound = function(data, size_n, size_p){
	if(data === undefined){
		console.error('Nothing to store');
	}
	if(this.currentData === undefined || this.currentData.storage === undefined){
		console.error('Nowhere to store');
	}

	var storage = this.currentData.storage;

	var outOfBound = (data.length + storage.length) % (size_p*size_n);
	var sb = data.subarray(data.length-outOfBound, data.length);

	data = data.subarray(0, data.length-outOfBound); 

	var buf = new ArrayBuffer(data.length + storage.length)
	var dataReady = new Uint8Array(buf);

	dataReady.set(storage);
	dataReady.set(data,storage.length);
	this.currentData.storage = sb;
	return dataReady;
};



DataReceivedManager.prototype.storeTexture = function (info){

	if (this.parent.verbose) console.log(info.path);

	var that = this;
	var textureId = this.currentData.guid;
	var onLoad = function (img){
		if (this.parent.verbose) console.log(' ---------------- ON LOAD ----------------');
		var currentTexture = that.dataReceived[textureId];
		currentTexture.data.image 		= img;
		currentTexture.data.needsUpdate = true;
		currentTexture.onProgress		= false;
	};
	var onProgress = function (event){
		if (this.parent.verbose) {
			console.log(' ---------------- ON PROGRESS ----------------');
			console.log(event);
		}
		var currentTexture = that.dataReceived[textureId];
		/*TO DO*/
	};
	var onError = function (e){
		console.error('In storeTexture ');
		console.error(e);
	};
	
	//Need to check texture format to choose the right way for loading it
	if(info.path.indexOf('.tga')===info.path.length-4){  // .tga
		var scope = new THREE.TGALoader();
		var loader = new THREE.XHRLoader( scope.manager );

		loader.setResponseType( 'arraybuffer' );

		loader.load( info.path, function ( buffer ) {

			that.images[that.currentData.source] = scope.parse( buffer );
			if ( onLoad !== undefined ) {
				onLoad( that.images[that.currentData.source] );
			}
		}, onProgress, onError );	
	}
	else if(info.path.indexOf('.dds')===info.path.length-4){  // .dds  That's a hack because we don't fill that.images :/  TO FIx
		var loader = new THREE.DDSLoader();

		var textCompressed = loader.load(info.path);
		this.dataReceived[textureId].data = textCompressed;
		//this.images[this.currentData.source]
	}
	else{ // .jpg .jpeg .png ...
		this.images[this.currentData.source] = new THREE.ImageLoader().load(info.path, onLoad, onProgress, onError);
	}
};



DataReceivedManager.prototype.storeMaterial = function (info){
/*TODO FOR THE MOMENT WE MANAGE ONLY A PARTICULAR CASE. Need to add KHR_Common_EXT */
	var material = this.currentData.data;

	var params = Object.keys(info.values);

	for (var i=0; i<params.length; i++){
		if(typeof info.values[params[i]] === 'string'){
			var texture = this.getTexture(info.values[params[i]]);
			switch(params[i]){
				case 'diffuse':
					material.map = texture;
					break;
				case 'gloss':
					material.roughnessMap = texture;
					break;
				case 'normal':
					material.normalMap = texture;
					break;
				case 'bump':
					material.normalMap = texture;
					break;
				default :
					break;
			}
		}
	}
	material.needsUpdate = true;
};

DataReceivedManager.prototype.storeBuffer = function(data) {

	var size_n = getSizeOfType(this.currentData.type);
	var size_p = getSizeOfComponentType(this.currentData.componentType);
	var that = this;
	
	if (size_n*size_p !== this.currentData.byteStride && this.currentData.byteStride !== 0 &&this.currentData.byteStride !== undefined){
		console.error('Interlaced data are not supported actualy');
		return;
		/*TODO*/
	}

	var dataOrganized = this.splitAndStoreDataOutOfBound(data, size_p, size_n);
	var littleIndian = true;

	switch(this.currentData.componentType){
		case 5126:
			var dataReady = Uint8ToFloat32Array(dataOrganized, littleIndian);
			break;
		case 5123:
			var dataReady = Uint8ToUint16Array(dataOrganized, littleIndian);
			break;
		default:
			console.error(this.currentData.componentType,' is not suported for the moment');
			break;
	}

	if (this.currentData.attribute ==='skin'){ 

		var matAlreadyReceived 	= this.currentData.sizeReceived / 16;
		var matReceived 		= dataReady.length/16;
		for (var i=matAlreadyReceived, j=0; i<matReceived; i++, j++){
			this.currentData.data[i].set( 	dataReady[j * 16 + 0],  dataReady[j * 16 + 4],  dataReady[j * 16 + 8],  dataReady[j * 16 + 12],
											dataReady[j * 16 + 1],  dataReady[j * 16 + 5],  dataReady[j * 16 + 9],  dataReady[j * 16 + 13],
											dataReady[j * 16 + 2],  dataReady[j * 16 + 6],  dataReady[j * 16 + 10], dataReady[j * 16 + 14],
											dataReady[j * 16 + 3],  dataReady[j * 16 + 7],  dataReady[j * 16 + 11], dataReady[j * 16 + 15] );
		}
	}
	else if (this.currentData.attribute.indexOf('Anim_Param')===0){
		
		this.currentData.data.set(dataReady,this.currentData.sizeReceived);
		this.currentData.linkedTo.forEach(function(elt,index,array){
												that.updateAnimation(elt, that.currentData.guid); //update all animations using this data
											}); 
	}
	else{
		this.currentData.data.array.set(dataReady,this.currentData.sizeReceived);
		this.currentData.data.needsUpdate = true;
	}

	this.currentData.sizeReceived += dataReady.length;

	if (this.currentData.sizeReceived === this.currentData.count){
		this.currentData.inProgress = false;

		if (this.currentData.attribute === 'skin'){ //link skeleton with our mesh not that we have all the informations tu build a correct mesh
			this.linkSkeleton2Mesh(this.currentData.propertyID, this.currentData.propertyID);
		}
		// if (this.currentData.attribute ==='position'){
		// 	//her we should to reactivate .frustumCulled = true. But we don't know the owner(s) of this array => TO THINK & FIX
		// }
	}
};

DataReceivedManager.prototype.storeAssetInformation = function (info){ 
	this.info = info;
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////// STREAM MANAGER //////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function StreamManager (websocket) {
	this.dataManager 	= new DataReceivedManager(this);
	this.threejsScene 	= undefined;
	this.startTime 		= Date.now(); //used to set the same reference for every animation
	this.info 			= {};
	this.delay 			= 0; //used to simulate delay with server
	this.ws 			= websocket;
	this.isLaunched 	= false;
	this.verbose 		= false;
	this.envMap 		= undefined;
	this.previousMessageDontNeedPause = false; //used for lag simulation
	this.defaultTexture = undefined;
	this.defaultImage 	= undefined;
	this.defaultMaterial= new THREE.MeshStandardMaterial( { color: 0xFFFFFF, roughness: 0.8, metalness: 0.25});

	var numberOfPacketReceived = 0;
	var that = this;

	this.ws.on('data', function (message) {  

		if(that.delay > 0 && !that.previousMessageDontNeedPause){
			that.ws.pause();
			var info = that.getCurrentInfo();
			if (info.attribute && info.attribute.indexOf('Anim_Param')>=0){
				if (that.streamMode.primitive.extra.indexOf('TEMPORAL')>=0){ //because in this mode a lot of small chuncks are sent. So we don't want to wait to much between each chunk
					setTimeout(function(){that.ws.resume();}, that.delay/500);
				}
				else{
					setTimeout(function(){that.ws.resume();}, that.delay/2);
				}
			}
			else{
				setTimeout(function(){that.ws.resume();}, that.delay);
			}
		} 

		numberOfPacketReceived++;
		if (that.verbose) console.log(numberOfPacketReceived +'th packet');
		that.previousMessageDontNeedPause = false;

		that.manageMessage(message);
		
		that.dataManager.sizeRecieved+=message.length;
	}); 

	this.ws.on('end', function () {    
		console.log('------------------- DISCONNECTED -----------------');
		this.isLaunched = false;
	}); 

	/*TODO this.ws.on('load', this.sendAssetRe...)*/

};

StreamManager.prototype.loadModel = function (path, mode){

	this.setStreamMode(mode);
	this.sendAssetRequiered(path,mode);

	this.isLaunched = true;
}

StreamManager.prototype.setDefaultImage = function (img){
	this.defaultImage = img;
	if (this.defaultTexture === undefined){
		this.defaultTexture = new THREE.Texture();
	}		
	this.defaultTexture.image = img;
 	this.defaultTexture.needsUpdate = true;;

 	this.defaultMaterial.map = this.defaultTexture;
	this.defaultMaterial.previousMaterial = null; //We add a new attribute to material for the display functionalities
	this.defaultMaterial.metalnessMap = this.defaultTexture;
	this.defaultMaterial.roughnessMap = this.defaultTexture;
};

StreamManager.prototype.bindScene = function (scene){
	this.threejsScene = scene;
};

StreamManager.prototype.setOnSuccess = function (fct){
	if (typeof fct === 'function'){
		this.onSuccess = fct;
	}
	else{
		console.warn('onSuccess must be like:  function (message){...}');
	}
};

StreamManager.prototype.setEnvMap = function(newEnvMap){
	this.envMap = newEnvMap;
	this.defaultMaterial.envMap = newEnvMap;
};

//This is for simulating a slow connection
StreamManager.prototype.setDelay = function (del){
	this.delay = del;
};

StreamManager.prototype.setVerbose = function (bool){
	this.verbose = bool;
};

StreamManager.prototype.getCurrentInfo = function (){
	return this.dataManager.getInfo();
};


/* This function manage our header by creating an item if needed(mesh,material,texture...), and select the data to work with */
StreamManager.prototype.manageHeader = function (header) {
	switch(header._i){
		case 'ai':
			delete header._i;
			this.dataManager.storeAssetInformation(header);
			break;
		case 'bi':
			this.dataManager.manageData(header);
			break;
		case 'ti':
			this.dataManager.manageData(header); 
			break;
		case 'td':
			this.dataManager.storeTexture(header);
			break;
		case 'mi':
			this.dataManager.manageData(header); 
			break;
		case 'md':
			this.dataManager.storeMaterial(header);
			break;
		case 'ci':
			this.dataManager.manageData(header);
			break;
		case 'aci':
			this.dataManager.manageData(header);
			this.previousMessageDontNeedPause = true;
			break;
		case 'si':
			this.dataManager.manageData(header); 
			break;
		case 'er':
			console.error(header.message);
			this.previousMessageDontNeedPause = true;
			break;
		case 'wa':
			console.warn(header.message);
			this.previousMessageDontNeedPause = true;
			break;
		case 'cc':
			/*TODO*/
			break;
		case 'sc':
			this.onSuccess(header.message);
			break
		default:
			console.warn('This kind of header is not supported by the client: '+header._i);
			break;
	}
};

StreamManager.prototype.manageMessage = function (message){

	var headerInformation;

	if (message[0]===123){ //For sure, if the first octet != 123 it cant be a JSON 
		try{headerInformation = JSON.parse(message);}
		catch(e){

		};
		
		if(headerInformation!==undefined){
			if (this.verbose) console.log(headerInformation);
			this.manageHeader(headerInformation);
		}
		else{
			this.dataManager.storeBuffer(message);
		}
	}

	else{
		this.dataManager.storeBuffer(message);
	}
};

StreamManager.prototype.sendAssetRequiered = function(asset,streamMode) {
	if(asset===undefined){
		alert('You must give a valid url to see something (ex: http://localhost:8080/?url=/viewer/assets/Book/glTF/books-test.gltf');
		return;
	}
	if (streamMode !== undefined){
		this.setStreamMode(streamMode);
	}

	var assetsRequired = {
		_i		: 'ar', //Asset Required
		url 	: asset,
	};

	this.ws.write(JSON.stringify(assetsRequired));
	if(this.verbose){
		console.log('----------- ASSETS REQUIRED -----------');
		console.log(assetsRequired)
	}
};

StreamManager.prototype.setStreamMode = function (streamMode){
 	if (streamMode === undefined){
		this.streamMode = {	asset: 		{sort:'DEFAULT', display:'ONEAFTERONE', extra:'INDICES'}, 
							primitive: 	{sort:'DEFAULT', display:'DEFAULT', extra:'NONE'}, 
							attribute: 	{sort:'DEFAULT'}};
	}
	else{
		this.streamMode = streamMode;
	}
	this.sendSortingRequiered(streamMode);
};

StreamManager.prototype.sendSortingRequiered = function(streamMode) {
	var sortingRequired = {
		_i		: 'sr', //Sorting Required
		behavior: streamMode
	};
	this.ws.write(JSON.stringify(sortingRequired));
	if(this.verbose){
		console.log('----------- SORTING REQUIRED -----------');
		console.log(streamMode)
	}
};

StreamManager.prototype.resumeStream = function() {
	this.ws.resume();
};

StreamManager.prototype.pauseStream = function(){
	if (this.ws !== undefined){
		if (this.verbose) console.log('Stream stoped');
		this.setDelay(0x7FFFFFFF);
	}
};

StreamManager.prototype.resetStream = function(){
		if (this.ws !== undefined){
			this.ws.end();
		}
		/*TODO*/
};

