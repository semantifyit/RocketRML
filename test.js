const mapfile = require('./mapfile/mapfileParser.js');
const inputparser = require('./input-parser/logicalSourceParser.js');
const xmlParser = require('./input-parser/xmlParser.js');
const objectHelper = require('./helper/objectHelper.js');
const prefixhelper = require('./helper/prefixHelper.js');
const start = require('./index.js');

const fs = require('fs');

const pathJSON='./examples/examplemap2.ttl';
const path='./examples/examplemap.ttl';
const pathOut='./examples/ out.json';

start.start(pathJSON, pathOut);