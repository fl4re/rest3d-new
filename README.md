# rest3d

This project aims to provide a protocol and tools to feed a client with 3D data. 
The main idea is to let the client decide what kind of data to visualize first. 
In order to be generic and to not depend on other restrictive licensed tools, rest3d is based on [glTF format](https://github.com/KhronosGroup/glTF), [three.js 3D library](http://threejs.org) and [Node.js](https://nodejs.org).

This project was presented at [WebGL & glTF BOF - SIGGRAPH 2016](https://www.youtube.com/watch?v=0eWUzCa_M0E&t=44m0s)


## How to run the example:

1. Clone or download this project
2. [Install Node.js](https://docs.npmjs.com/getting-started/installing-node) (v4.4.7) if it's not already installed
3. At src/server/ `npm install`
4. At example/ `npm install` 
5. At example/ `npm start`
6. Open `http://localhost:8080` in your browser
7. Click `start` button

## Usage

###Server
```javascript
var ws =  require('websocket-stream');
var gltfStreamer = require('rest3d_server');

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
<script src="./rest3d_client.js"></script> 

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

**Visit the [example page](https://github.com/fl4re/rest3d-new/tree/master/example) for a ready to use example.**

**Visit the [wiki](https://github.com/fl4re/rest3d-new/wiki) for more details.**

## Supported features checklist
- [x] Send server errors and warnings to client
- Loading by URL: 
	- [x] For 'file:///'
	- [ ] For 'http:///'
- Interlaced binary: 
	- [x] Server: Yes, but depreciated
	- [ ] Client
- [x] Asset Infos
- [x] Sort
- [x] GUI example
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
- [ ] Camera Feedback

## Credits

[Starbreeze Studios](http://www.starbreeze.com)

###Author
**Selim Bekkar** : selim.bekkar_at_contractors.starbreeze.com

###Contributors
**Maxime Helen** : maxime.helen_at_starbreeze.com

**Remi Arnaud** : remi.arnaud_at_starbreeze.com

**Mark Barnes** : mark.barnes_at_starbreeze.com

**Tony Parisi** : [Website](https://tonyparisi.wordpress.com)

## License

[MIT](https://github.com/fl4re/rest3d-new/blob/master/LICENSE)
