
##About rest3d
This project aim to provide a protocol and tools to feed a client with 3d data. 
The main idea is to let the client decide what kind of data he want to visualise in first. 
To be generic and not depending on other restrictive liscence tools, rest3d is based on [glTF format](https://github.com/KhronosGroup/glTF) and [three.js 3D library](http://threejs.org) and [Node.js](https://nodejs.org).

## How to run & try:
1. clone or download this project
2. [install nodejs](https://docs.npmjs.com/getting-started/installing-node) if you never did
3. at rest3d-new-master/src/server/ `npm install`
4. at rest3d-new-master/example/ `npm install`
5. at rest3d-new-master/example/ `npm run start`
6. visit `http://localhost:8080`
7. press `start` button

##Usage
###Server
```javascript
var ws =  require('websocket-stream');
var gltfStreamer = require('gast-server');

function handle (stream){
    var assetManager = gltfStreamer.assetManager();
    assetManager.bindWebSocket(stream);
    assetManager.initEvent();
	
    stream.on('data', function(message){
        assetManager.feedbackManager(message); 
        });
};

ws.createServer({server: yourServer}, handle);
```

###Client
```javascript
<script src="./gast-client.js"></script> 

var websocket = require('websocket-stream');

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight ); document.body.appendChild( renderer.domElement );

var ws = websocket('ws://localhost:8080');
var streamManager = new StreamManager(ws);
streamManager.bindScene(scene);

function render() { 
    requestAnimationFrame( render );
    renderer.render( scene, camera ); 
}
render();
streamManager.launchStream('path/myAsset.gltf');

```
**Visit [example page](https://github.com/fl4re/rest3d-new/tree/master/example) for ready to use example **
**Visit [wiki page](https://github.com/fl4re/rest3d-new/wiki) for more details **

## What is supported or not:
- [x] Return server errors and warning to client
- Loading by URL: 
	- [x] For 'file:///'
	- [ ] For 'http:///'
- Interlaced binary: 
	- [x] Server: Yes, but depreciated
	- [ ] Client
- [x] Asset Infos
- [x] Trackball
- [x] Sort
- [x] GUI exemple
- [x] Multiple binary files for the same asset
- [x] Indices
- [x] Positions
- [x] Normals
- [x] Texture coordinates
- [x] Bones weigth
- [x] Bones indices
- [ ] Scenes
- [ ] LOD
- Displacement Parameters for a node:
	- [x] rotation
	- [x] translation
	- [x] scale
	- [x] quaternion
	- [x] matrix
- [x] Skeleton
- [x] Animations
- [x] Hierarchy
- [x] Cameras 
- [ ] Materials //In progress
- [ ] Shaders
- [ ] KHR_materials_common
- [x] Textures (jpg: OK, png: OK, tga: OK, dds:must be tested )
- [x] EnvMap
- [ ] PostFX
- [ ] Camera Feedback
- [ ] Help Menu
- [x] Layers display

###@author
**Selim Bekkar** selim.bekkar_at_gmail.com

[Starbreeze Studio](http://www.starbreeze.com)

###@contributor
**Maxime Helen** helenmaxime_at_gmail.com

**Remi Arnaud** remi.arnaud_at_starbreeze.com

**Mark Barnes** mark.barnes_at_starbreeze.com

[Starbreeze Studio](http://www.starbreeze.com)
 	