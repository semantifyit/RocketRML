function createNamespace(baseUri, localNames) {
  const namespace = {};
  for (const localName of localNames) {
    namespace[localName] = `${baseUri}${localName}`;
  }
  return namespace;
}

const RR = createNamespace('http://www.w3.org/ns/r2rml#', [
  'BlankNode',
  'IRI',
  'Literal',
]);

const RDF = createNamespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#', [
  'type',
]);

module.exports.RR = RR;
module.exports.RDF = RDF;
