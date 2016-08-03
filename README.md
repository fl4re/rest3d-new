
Selim Bekkar··
selim.bekkar_at_gmail.com··

[Starbreeze Studio](http://www.starbreeze.com)

# How to run:
1. npm install
2. node proxy.js
3. http://localhost:9224/cbp/open/viewer?url=file:///yourPath/fl4re-ui/src/server/static/cbp/assets/Book/glTF/books-test.gltf
4. play with buttons


#Usage
##Server
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

##Client
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
#How does this stream protocol works ? 

##Client side

###1. Bind
- Bind your StreamManager with a *THREE.Scene*: `myStreamManager.bindScene(myThreejsScene)`
- Define a default environment map *THREE.CubeTexture* **(optional)**: `myStreamManager.setEnvMap(myEnvironmentMap)`
- Define a default image for material textures **(optional)**: `myStreamManager.setDefaultImage(new THREE.ImageLoader().load('myDefaultImage.jpg'))`
- If you want to simulate slow connection use **(optional)**: `myStreamManager.setDelay(myDelay_in_ms)`
###2. Ask an asset
Client ask an asset by using `StreamManager.sendAssetRequiered(asset,streamMode)` where:
-`asset` is a path or the name of your asset. He must be a gltf file.
-`streamMode` is optional. See *How to change the transfert order ?*
###3. Data received

###4. Building

##Server side: 

###1. Parsing
Server parse the gltf asset asked by client. He create is own structure (closed to gltf specification). This structure can be resume as multiple stack of data to send. This one ensure server to sort this stack as he want and extract informations needed to rebuild the scene independantly of the order. Also we ensure to dont send redundant information. That mean for exemple that a geometry/material/... will not be send twice if two objects shared the same. 

###2. Sorting
Server sort his stacks with a specific order (if client asked). See *How to change the transfert order ?* for more information.
-Insert schema here-

###3. Transfert
Server send data sorted to the client. This process is a loop of 3 parts splited 
	1. **Sending a header.** This header contain all the informations to allow the client to manage this futur data (type of data, name, hierarchy...). See *What kind of different header can we have ?* for more information
	2. **Sending datas.** If they was not already sent. The server will send the datas. Size of different chunk can be controled by the `sizeOfChunk` attribube if `TEMPORAL` mode is activated. But it's not recommanded to keep the power of `websocket-stream` module, and let him to manage the stream process.·· **Note:** This part is totaly asynchrone and done by a series of events
	3. **Update stacks.** Depending on the behavior, the data stacks will be updated (data removed or premuted)

###4. Feedback


# How to change the transfert order ? 

Transfert order is defined as `behavior` in server classes.
Client can ask to server to sort data at anytime by using `javascript StreamManager.setStreamMode(streamMode)`

**Where *streamMode* must be defined as:**
```javascript
var streamMode = {asset: {sort:'MODE_WANTED', display:'MODE_WANTED', extra:'EXTRA_WANTED'}, 
				primitive: {sort:'MODE_WANTED', display:'MODE_WANTED', extra:'EXTRA_WANTED_1+EXTRA_WANTED_2+EXTRA_WANTED_3'}, 
				attribute: {sort:'MODE_WANTED'}};
```
You can add as much `extra` as you want by adding `+` ex: `'TEMPORAL+ANIM_IN_FIRST'`. If one field is missing, `'DEFAULT'` value will be applyed
##For Asset:
####Sort:
- `'MAX_ASCENDING'`: Assign to each mesh the biggest score of his primitives. Then sort meshes by ascending order
- **'DEFAULT'**: No ordering.
####Display:
- **'DEFAULT'**: Display one attribute (position, normal, material...) for all meshes. And then display the next attribute etc...
- **'ONEAFTERONE'**: Display one mesh totaly (all his attribute), and then display the next mesh.
####Extra:
- **'INDICES'**: Ask to send indices. By default indices are not sent.
- **'CAMERAS_IN_LAST'**: Cameras will be sent in last. By default cameras are sent in first.
##For Mesh:
####Sort:
- **'BB_DIST_ASCENDING'**: Compute the L2 bouding box norm and then sort the primitives by ascending distance order .
- **'DEFAULT'**: No ordering.
####Display:
- **'DEFAULT'**: Display one attribute (position, normal, material...) for all primitives. And then display the next attribute etc...
- **'ONEAFTERONE'**: Display one primitive totaly (all his attribute), and then display the next primitive.
#####Extra:
- **'ANIM_IN_FIRST'**: Ask to send animation ans bones in first.
- **'TEMPORAL'**: Load a sample of each animation chanel instead of loading full channel one after one. Should be used with 'DEFAULT' display to provide best result 
##For Attribute:
####Sort:
- **'DEFAULT'**: Order the attribute in this order: `'indices'` (if asked), `'POSITION'`, `'NORMAL'`, `'TEXCOORD_0'`, `'TEXTURE'`, `'material'`, left-over.

**Note:** 
- Cameras will always be sent in first. (new features can ba added to change this)
- You can ask a new behavior to the Server even if the stream is already lunch. If you do, the stream will be paused, the sever will compute the new order and then restart the stream without sending redundant information.
- streamMode is defined as *behavior* in server side.

# What kind of different header can we have ?

A header is JSON with some values depending of his type. The type is defined inside the _i value. 
[S->C] or [C->S] defined wich is the common transfert direction of header (from Client to Server or vice versa or both).

- **'ai'**,  [S-->C] : Asset Informations (version...). He is send at the begining, from server to client. when server done to parse the asset.
- **'bi'**,  [S-->C] : Buffer of data informations (type, size...). He is send before every new kind of buffer transfert.
- **'ti'**,  [S-->C] : Texture informations (warp, format,...).
- **'td'**,  [S-->C] : Texture data (path).
- **'mi'**,  [S-->C] : Material informations (path, warp,...).
- **'md'**,  [S-->C] : Material data stored in a JSON.
- **'ci'**,  [S-->C] : Camera informations+data stored in a JSON.
- **'si'**,  [S-->C] : Skin informations (bindShapeMatric, jointName & their ascendant hierarchy, ...)
- **'aci'**, [S-->C] : Animation channel informations + data stored in a JSON. (input, output, interpolation, path)
- **'er'**,  [S<->C] : Error (kind, message). She is send if an error is encouter. An error is critical and must stop the process.
- **'wa'**,  [S<->C] : Warning (kind, message). She is send if an unconvontinal things is encouter. This thing must be not critical and a Warning header (will not stop execution.)
- **'cc'**,  [C<->S] : Camera change information (position,...). /*TODO*/
- **'or'**,  [C-->S] : Ordering required.
- **'ar'**,  [C-->S] : Asset required.
- **'sc'**,  [S-->C] : Stream completed.

**Note:** Node hierarchy informations are send with the data buffer information `'bi'`.

# This explains what is supported or not:
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

## Idees: 

- On pourait ordonée les skins et leur animations associé en fonction de leur hauteur dans l'abre. Car y'a des chance pour que plus il soit proche de la racine, plus il soit important.

- Camera shared. Plusieurs clients visualisent le meme maillage et un seul d’entre eux a le contrôle de la camera.


## Discution about some technical choices:

- About accessor and buffer views merged and interlaced data: Server try to minimize the data size to transfert. For exemple, we will check if an accessor has been already sent before sending him again. But, we will not doing this for the buffer view. The main reason is beacause to keep the synchronization with the client and keep the fonctionality of interupting a transfer to switch to another one. We will need to drastically increase the header size, the computing process and the storage size on the client side, and the datastructure size for the both sides. Thus it's why I choose to resend a bufferview (if data ara interlaced or if accessor C lap on accessor A and B ) instead of increasing all the process for the non-interlaced case.
BTW, the effect produced by interlaced data is useless. It's more important to display geometry quickly => send all `'POSITION'` in first. 


 	