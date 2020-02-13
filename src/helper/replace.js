const clone = obj => JSON.parse(JSON.stringify(obj));

const isJsonLDReference = obj => obj['@id'] && Object.keys(obj).length === 1;

// may create circular data-structure (probably not common in rml though)
const jsonLDGraphToObj = (graph, deleteReplaced = false) => {
  if (graph.some(n => !n['@id'])) {
    throw new Error('node without id');
  }
  const replacedIds = [];
  const obj = Object.fromEntries(graph.map(node => [node['@id'], node]));
  // console.log(JSON.stringify(obj, null, 2));
  for (const id in obj) {
    for (const key in obj[id]) {
      // assume not array for now
      if (Array.isArray(obj[id][key])) { // case array, else single obj
        for (const index in obj[id][key]) {
          if (isJsonLDReference(obj[id][key][index]) && obj[obj[id][key][index]['@id']]) { // if its reference and the reference id is included in the graph
            replacedIds.push(obj[id][key][index]['@id']);
            obj[id][key][index] = obj[obj[id][key][index]['@id']];
          }
        }
      } else if (isJsonLDReference(obj[id][key]) && obj[obj[id][key]['@id']]) { // if its reference and the reference id is included in the graph
        replacedIds.push(obj[id][key]['@id']);
        obj[id][key] = obj[obj[id][key]['@id']];
      }
    }
  }
  // console.log(obj);
  // console.log(JSON.stringify(Object.values(obj), null, 2));
  const newGraph = Object.values(obj);
  if (deleteReplaced) {
    return newGraph.filter(node => !replacedIds.includes(node['@id']));
  }
  return newGraph;
};

const replace = (graph) => {
  const connectedGraph = jsonLDGraphToObj(graph, true);
  // test for circular deps & remove links
  try {
    const graphCopy = clone(connectedGraph);
    return graphCopy;
  } catch (e) {
    console.error('Could not replace, circular dependencies when replacing nodes');
    return graph;
  }
};


module.exports.replace = replace;
module.exports.jsonLDGraphToObj = jsonLDGraphToObj;
