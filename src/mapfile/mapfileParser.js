const N3 = require('n3');
const jsonld = require('jsonld');
const helper = require('../input-parser/helper.js');
const prefixHelper = require('../helper/prefixHelper.js');
const { jsonLDGraphToObj } = require('../helper/replace.js');

const quadsToJsonLD = async (nquads, context) => {
  let doc = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });
  doc = await jsonld.compact(doc, context);
  return doc;
};

const ttlToJson = ttl => new Promise((resolve, reject) => {
  const parser = new N3.Parser();
  const writer = new N3.Writer({ format: 'N-Triples' });
  ttl = helper.escapeChar(ttl);
  parser.parse(ttl,
    (error, quad, prefixes) => {
      if (error) {
        reject(error);
      } else if (quad) {
        writer.addQuad(quad);
      } else {
        writer.end((writeError, result) => {
          if (writeError) {
            reject(writeError);
            return;
          }
          resolve(quadsToJsonLD(result, prefixes));
        });
      }
    });
});

function hasLogicalSource(e) {
  return Object.keys(e).find(x => x.match(/.*logicalSource/));
}
function hasSubjectMap(e) {
  return Object.keys(e).find(x => x.match(/.*subjectMap/));
}

function isFunction(e) {
  if (e.predicateObjectMap && Array.isArray(e.predicateObjectMap)) {
    for (const obj of e.predicateObjectMap) {
      if (obj.predicate && obj.predicate['@id'] && obj.predicate['@id'].indexOf('executes') !== -1) {
        return true;
      }
      if (obj.predicateMap && obj.predicateMap && obj.predicateMap['@id']) {
        const predMap = obj.predicateMap;
        if (predMap && predMap.constant && predMap.constant['@id'] && predMap.constant['@id'].indexOf('executes') !== -1) {
          return true;
        }
      }
    }
  }
  return false;
}


const getTopLevelMappings = (graphArray) => {
  const toplevelMappings = [];
  if (!graphArray || !graphArray.length) {
    // graphArray is not an array
    throw ('Error during processing mapfile: Wrong shape!');
  }
  graphArray.forEach((e) => {
    const id = e['@id'];
    if (hasLogicalSource(e) && !isFunction(e)) {
      if (!hasSubjectMap(e)) {
        throw (`${id} is missing a subjectMap!`);
      }
      toplevelMappings.push(id);
    }
  });
  if (graphArray.length === 0) {
    // mapfile does not contain any toplevel mappings
    throw ('getTopLevelMappings(): Error during processing mapfile: no toplevel found! (only blank nodes)');
  }
  return toplevelMappings;
};

// returns object with prefixes, graph, and all top-level mappings
const expandedJsonMap = async (ttl) => {
  const response = await ttlToJson(ttl);
  const result = {};
  result.prefixes = response['@context'];
  const regex = /@base <(.*)>/;
  let base = '_:';
  if (ttl.match(regex) && ttl.match(regex)[1]) {
    base = ttl.match(regex)[1];
  }
  if (!result.prefixes) {
    result.prefixes = {};
  }
  result.prefixes.base = base;
  const prefixFreeGraph = response['@graph'].map(node => prefixHelper.checkAndRemovePrefixesFromObject(node, result.prefixes));
  const connectedGraph = jsonLDGraphToObj(prefixFreeGraph);
  result.data = connectedGraph;
  result.topLevelMappings = getTopLevelMappings(result.data);
  return result;
};

module.exports.ttlToJson = ttlToJson;
module.exports.expandedJsonMap = expandedJsonMap;
