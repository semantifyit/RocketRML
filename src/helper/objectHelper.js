const helper = require('../input-parser/helper');
const prefixHelper = require('./prefixHelper');

const findIdinObjArr = (objArr, id, prefixes) => {
  const obj = objArr.find(
    (o) =>
      prefixHelper.replacePrefixWithURL(o['@id'], prefixes) ===
      prefixHelper.replacePrefixWithURL(id, prefixes),
  );
  return obj;
};

const removeEmpty = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] && typeof obj[key] === 'object') removeEmpty(obj[key]);
    else if (obj[key] == null) delete obj[key];
  });
};

const removeMeta = (obj) => {
  const result = [];
  Object.keys(obj).forEach((key) => {
    const temp = helper.addArray(obj[key]);
    for (const t of temp) {
      removeMetaOnObject(t);
      result.push(t);
    }
  });
  return result;
};

const removeMetaOnObject = (t) => {
  if ('_index' in t) {
    delete t._index;
  }
  if (t.$parentTriplesMap) {
    delete t.$parentTriplesMap;
  }
  if (t.$parentPaths) {
    delete t.$parentPaths;
  }
};

// Put each triple of a node object in its graphs: those of the subject map ($graphs)
// and those of the predicate-object map of its predicate ($predicateGraphs), else the
// default graph. A node with no graph map is left as it is.
const DEFAULT_GRAPH = '@default';
const distributeGraphs = (nodes) => {
  const defaultNodes = [];
  const named = new Map();
  const put = (graph, node) => {
    if (graph === DEFAULT_GRAPH) {
      defaultNodes.push(node);
    } else {
      if (!named.has(graph)) named.set(graph, []);
      named.get(graph).push(node);
    }
  };
  for (const node of nodes) {
    const subjectGraphs = node.$graphs || [];
    const predicateGraphs = node.$predicateGraphs || {};
    delete node.$graphs;
    delete node.$predicateGraphs;
    if (!subjectGraphs.length && !Object.keys(predicateGraphs).length) {
      defaultNodes.push(node);
      continue;
    }
    const byGraph = new Map();
    for (const key of Object.keys(node)) {
      if (key === '@id') continue;
      let graphs = [...new Set(subjectGraphs.concat(predicateGraphs[key] || []))];
      if (!graphs.length) graphs = [DEFAULT_GRAPH];
      for (const graph of graphs) {
        if (!byGraph.has(graph)) byGraph.set(graph, { '@id': node['@id'] });
        byGraph.get(graph)[key] = node[key];
      }
    }
    for (const [graph, part] of byGraph) put(graph, part);
  }
  for (const [graph, graphNodes] of named) {
    defaultNodes.push({ '@id': graph, '@graph': graphNodes });
  }
  return defaultNodes;
};

const convertType = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (
      key === 'rdf:type' ||
      key === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
    ) {
      const temp = helper.addArray(obj[key]);
      if (temp && temp[0] && typeof temp[0] === 'object') {
        return;
      }
      const type = obj[key];
      delete obj[key];
      obj['@type'] = type;
    } else if (obj[key] && typeof obj[key] === 'object') {
      convertType(obj[key]);
    }
  });
};

module.exports.findIdinObjArr = findIdinObjArr;
module.exports.removeEmpty = removeEmpty;
module.exports.removeMeta = removeMeta;
module.exports.convertType = convertType;
module.exports.distributeGraphs = distributeGraphs;
