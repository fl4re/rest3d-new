
Selim Bekkar··
selim.bekkar_at_gmail.com··

[Starbreeze Studio](http://www.starbreeze.com)

##About rest3d

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

ws.createServer({port: 9225}, handle);
```

###Client
```javascript
<script src="./gast-client.js"></script> 

var websocket = require('websocket-stream');

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight ); document.body.appendChild( renderer.domElement );

var ws = websocket('ws://localhost:9225');
var streamManager = new StreamManager(ws);
streamManager.bindScene(scene);

function render() { 
    requestAnimationFrame( render );
    renderer.render( scene, camera ); 
}
render();
streamManager.launchStream('path/myAsset.gltf');

```
Visit [example page](https://github.com/fl4re/rest3d-new/tree/master/example) ready to use file 
Visit [wiki page](https://github.com/fl4re/rest3d-new/wiki) for more details 

## How to run:
1. npm install
2. node proxy.js
3. http://localhost:9224/cbp/open/viewer?url=file:///yourPath/fl4re-ui/src/server/static/cbp/assets/Book/glTF/books-test.gltf
4. play with buttons

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

 	