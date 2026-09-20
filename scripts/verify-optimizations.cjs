// Run repository TypeScript directly without adding a test-runner dependency.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname,'..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name,...args) { return resolve.call(this,name.startsWith('@/') ? path.join(root,name.slice(2)) : name,...args); };
require.extensions['.ts'] = (module,filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},fileName:filename,
}).outputText,filename);
const THREE = require('three');
const { worldBlocks } = require('../data/world.ts');
const { updateChunkIndex, buildChunkSurfaces, surfaceGeometry, chunkKey } = require('../components/scene/game/terrain/chunkGeometry.ts');
const { raycastVoxelGrid } = require('../components/scene/game/terrain/gridRaycast.ts');
const { getPickRegistry, intersectPickTargets } = require('../components/scene/game/interaction/pickRegistry.ts');
const { getCenterTerrainHit, getDoorTogglePrimaryId } = require('../components/scene/game/terrain/raycastTerrain.ts');
const { createWaterStepper } = require('../components/scene/game/water/waterStepper.ts');
const { tickWater, initWaterCells } = require('../components/scene/game/water/waterSimulation.ts');
const { configurePixelTexture } = require('../components/scene/game/materials/configurePixelTexture.ts');
const { percentile } = require('../components/scene/game/performance/metrics.ts');
let passed=0;
function test(name,body) { body(); passed++; console.log('PASS',name); }
const block=(x,y,z,material='dirt')=>({position:[x,y,z],material,solid:true});
const countFaces = index => [...index.chunks.values()].reduce((n,c)=>n+buildChunkSurfaces(c,index.cells).reduce((n,s)=>n+s.positions.length/18,0),0);
const blank=()=>({removedKeys:new Set(),placedBlocksByKey:new Map(),placedSolidColumns:new Map(),placedFixtureSolidColumns:new Map(),activeFixtureBlockKeys:new Set(),doorObstacles:[]});

test('Opaque neighbors lose only the two hidden faces; isolated block UVs/winding match Three',()=>{
 assert.equal(countFaces(updateChunkIndex(undefined,[block(0,.5,0),block(1,.5,0)])),10);
 const index=updateChunkIndex(undefined,[block(0,.5,0)]); const surface=buildChunkSurfaces([...index.chunks.values()][0],index.cells)[0];
 const geometry=surfaceGeometry(surface); const box=new THREE.BoxGeometry().toNonIndexed();
 assert.deepEqual([...geometry.getAttribute('uv').array],[...box.getAttribute('uv').array]);
 assert.deepEqual([...geometry.getAttribute('normal').array],[...box.getAttribute('normal').array]);
 geometry.dispose(); box.dispose();
});
test('Transparent and unlit boundaries retain their original faces',()=>{
 for(const material of ['glass','leaves','spawnBoard']) assert.equal(countFaces(updateChunkIndex(undefined,[block(0,.5,0),block(1,.5,0,material)])),12);
});
test('Chunk boundary edits invalidate neighbors but retain distant chunks',()=>{
 const blocks=[block(31,.5,0),block(32,.5,0),block(100,.5,0)]; const first=updateChunkIndex(undefined,blocks);
 const second=updateChunkIndex(first,blocks.slice(1));
 assert.notEqual(second.chunks.get(chunkKey(blocks[1].position)),first.chunks.get(chunkKey(blocks[1].position)));
 assert.equal(second.chunks.get(chunkKey(blocks[2].position)),first.chunks.get(chunkKey(blocks[2].position)));
 assert.equal(countFaces(second),12);
 const third=updateChunkIndex(second,[block(32,.5,0,'grass'),blocks[2]]);
 assert.notEqual(third.chunks.get(chunkKey(blocks[1].position)),second.chunks.get(chunkKey(blocks[1].position)));
});
test('Unchanged input reuses chunk objects; empty world removes all chunks',()=>{
 const first=updateChunkIndex(undefined,worldBlocks); const next=updateChunkIndex(first,worldBlocks.map(b=>({...b})));
 for(const [key,c] of first.chunks)assert.equal(next.chunks.get(key),c);
 assert.equal(updateChunkIndex(next,[]).chunks.size,0);
});
test('Grid rays support all six faces, negative coordinates, reach, and inside origins',()=>{
 const target=block(-2,.5,-3);const lookup=k=>k===target.position.join(':')?target:undefined;
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const origin=new THREE.Vector3(...target.position);origin.setComponent(axis,origin.getComponent(axis)+sign*3);
  const direction=new THREE.Vector3();direction.setComponent(axis,-sign);
  const ray=new THREE.Ray(origin,direction);const hit=raycastVoxelGrid(ray,3,lookup);
  assert.equal(hit.block,target);assert.equal(hit.distance,2.5);assert.equal(hit.normal.getComponent(axis),sign);
  assert.equal(raycastVoxelGrid(ray,2.49,lookup),null);
 }
 assert.equal(raycastVoxelGrid(new THREE.Ray(new THREE.Vector3(...target.position),new THREE.Vector3(1,0,0)),5,lookup),null);
 const onFace=new THREE.Vector3(...target.position);onFace.x-=.5;
 assert.equal(raycastVoxelGrid(new THREE.Ray(onFace,new THREE.Vector3(1,0,0)),1,lookup).distance,0);
});
const scene=new THREE.Scene(); const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),worldBlocks.length);
worldBlocks.forEach((b,i)=>mesh.setMatrixAt(i,new THREE.Matrix4().makeTranslation(...b.position)));mesh.computeBoundingSphere();mesh.updateMatrixWorld();
const cells=new Map(worldBlocks.map(b=>[b.position.join(':'),b]));
let seed=17; const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const rays=Array.from({length:300},()=>new THREE.Ray(new THREE.Vector3(random()*44-22,random()*8+.1,random()*44-22),new THREE.Vector3(random()-.5,random()-.7,random()-.5).normalize()));
test('300 deterministic terrain rays agree with the original full-cube mesh',()=>{
 for(const ray of rays){const r=new THREE.Raycaster(ray.origin,ray.direction,0,8);const old=r.intersectObject(mesh)[0];const hit=raycastVoxelGrid(ray,8,k=>cells.get(k));
  assert.equal(!!hit,!!old);
  if(hit){assert.equal(hit.block,worldBlocks[old.instanceId]);assert.ok(Math.abs(hit.distance-old.distance)<1e-6);assert.ok(hit.normal.distanceTo(old.face.normal)<1e-6);}
 }
});
test('Registry tracks additions/removals, inherited fixture metadata and asynchronous links',()=>{
 const s=new THREE.Scene();const registry=getPickRegistry(s);const group=new THREE.Group();group.userData={terrainMaterial:'wood',fixturePrimaryId:'door',fixtureKind:'door'};
 const m=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());group.add(m);s.add(group);assert.equal(registry.targets('door').length,1);
 group.remove(m);assert.equal(registry.targets('door').length,0);s.add(m);assert.equal(registry.targets('interaction').length,0);
 m.userData.resolveIntroLink=()=>null;assert.equal(registry.targets('interaction').length,1);s.remove(m);assert.equal(registry.targets('interaction').length,0);
});
test('Restricted links preserve through-terrain behavior and maximum reach',()=>{
 const s=new THREE.Scene();const m=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());m.position.z=-3;m.userData.externalHref='https://example.com';s.add(m);
 const r=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,0,-1),0,2);assert.equal(intersectPickTargets(s,r,'interaction').length,0);
 r.far=4;assert.ok(intersectPickTargets(s,r,'interaction').length>0);
});
test('Terrain cache invalidates after replacement/removal and fixture movement; doors remain pickable',()=>{
 const s=new THREE.Scene(),r=new THREE.Raycaster(),camera=new THREE.PerspectiveCamera();camera.position.set(100,2.5,104);camera.lookAt(100,2.5,100);
 let occupancy=blank();occupancy.placedBlocksByKey.set('100:2.5:100',block(100,2.5,100));
 const first=getCenterTerrainHit(r,camera,s,6,occupancy);assert.equal(first.blockKey,'100:2.5:100');assert.equal(getCenterTerrainHit(r,camera,s,6,occupancy),first);
 occupancy=blank();assert.equal(getCenterTerrainHit(r,camera,s,6,occupancy),null);
 const door=new THREE.Mesh(new THREE.BoxGeometry(1,2,.2),new THREE.MeshBasicMaterial());door.position.set(100,2.5,101);door.userData={terrainMaterial:'wood',fixturePrimaryId:'test-door',fixtureKind:'door',fixtureBreakPosition:[100,2.5,101]};s.add(door);
 assert.equal(getCenterTerrainHit(r,camera,s,6,occupancy).blockKey,'test-door');assert.equal(getDoorTogglePrimaryId(r,camera,s,6,occupancy),'test-door');
 door.position.x=105;assert.equal(getCenterTerrainHit(r,camera,s,6,occupancy),null);
});
test('Water sleeps at a fixed point and matches original ticks after occupancy edits',()=>{
 const step=createWaterStepper(); let a=initWaterCells([{position:[0,.5,0]}]),b=a,revision={};let calls=0;
 let solid=(x,y,z)=>y<0||Math.abs(x)>1||Math.abs(z)>1;
 for(let i=0;i<4;i++){a=step(a,revision,(...args)=>{calls++;return solid(...args)});b=tickWater(b,solid);assert.deepEqual(a,b)}
 calls=0;assert.equal(step(a,revision,(...args)=>{calls++;return solid(...args)}),a);assert.equal(calls,0);
 revision={};solid=(x,y,z)=>y<0||Math.abs(x)>1||Math.abs(z)>1||(x===0&&z===0);
 for(let i=0;i<10;i++){a=step(a,revision,solid);b=tickWater(b,solid);assert.deepEqual(a,b)}
});
test('Shared texture configuration marks upload only once',()=>{
 const texture=new THREE.Texture();configurePixelTexture(texture);const version=texture.version;configurePixelTexture(texture);assert.equal(texture.version,version);assert.equal(texture.colorSpace,THREE.SRGBColorSpace);
});

console.log(`\n${passed} behavioral checks passed.`);
const summary={blocks:worldBlocks.length,originalFaces:worldBlocks.length*6,chunkSizes:[]};
for(const size of [8,16,32]){
 const index=updateChunkIndex(undefined,worldBlocks,size);const surfaces=[...index.chunks.values()].flatMap(c=>buildChunkSurfaces(c,index.cells));
 summary.chunkSizes.push({size,chunks:index.chunks.size,surfaceDraws:surfaces.length,faces:surfaces.reduce((n,s)=>n+s.positions.length/18,0)});
}
function benchmark(work){const samples=[];for(let repeat=0;repeat<5;repeat++){const start=performance.now();for(const ray of rays)work(ray);samples.push(performance.now()-start);}return +percentile(samples,.5).toFixed(2)}
summary.cpuMillisecondsFor300Rays={original:benchmark(ray=>new THREE.Raycaster(ray.origin,ray.direction,0,8).intersectObject(mesh)),grid:benchmark(ray=>raycastVoxelGrid(ray,8,k=>cells.get(k)))};
console.log(JSON.stringify(summary,null,2));
