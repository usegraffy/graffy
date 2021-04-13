import fb from 'flatbuffers';
import { encode, decode } from '@msgpack/msgpack'; // For values and opts
import { encode as encB64 } from '../coding/base64.js';
import { graph } from './graph2_generated.js';
// import { query } from './query_generated.js';

const builder = new fb.flatbuffers.Builder(1024);

const { GraphRoot, GraphItem, GraphLeaf } = graph;

/* Let's build the graph:
{ foo: 42 } */

const valOff = GraphLeaf.createValueVector(builder, encode(42));
const fooOff = GraphItem.createKeyVector(
  builder,
  new TextEncoder().encode('foo'),
);

GraphLeaf.startGraphLeaf(builder);
GraphLeaf.addValue(builder, valOff);
const leafOff = GraphLeaf.endGraphLeaf(builder);

GraphItem.startGraphItem(builder);
GraphItem.addKey(builder, fooOff);
GraphItem.addNode(builder, leafOff);
const itemOff = GraphItem.endGraphItem(builder);

// const prefOff = GraphList.createPrefixVector(builder, []);
// const itemsOff = GraphList.createItemsVector(builder, [itemOff]);
//
// GraphList.startGraphList(builder);
// GraphList.addPrefix(builder, prefOff);
// GraphList.addItems(builder, itemsOff);
// const listOff = GraphList.endGraphList(builder);

const chdnOff = GraphRoot.createChildrenVector(builder, [itemOff]);

GraphRoot.startGraphRoot(builder);
GraphRoot.addChildren(builder, chdnOff);
const root = GraphRoot.endGraphRoot(builder);

GraphRoot.finishGraphRootBuffer(builder, root);

const u8arr = builder.asUint8Array();
console.log(encB64(u8arr));

// console.log('Flatbuffers', flatbuffers);
// console.log('Schema', graph);

// --- reading back ---

const buf = new fb.flatbuffers.ByteBuffer(u8arr);

const readRoot = GraphRoot.getRootAsGraphRoot(buf);

console.log(readRoot.optionsArray(), readRoot.children(0));
