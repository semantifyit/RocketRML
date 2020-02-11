const namespaces = {
  rml: 'http://semweb.mmlab.be/ns/rml#',
  ql: 'http://semweb.mmlab.be/ns/ql#',
  rr: 'http://www.w3.org/ns/r2rml#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
};

const iris = {
  ql: ['JSONPath', 'Xpath'],
  rr: ['BlankNode', 'GraphMap', 'IRI', 'Join', 'Literal', 'ObjectMap', 'PredicateMap', 'PredicateObjectMap', 'RefObjectMap', 'SQL2008', 'SubjectMap', 'TermMap', 'TriplesMap', 'child', 'class', 'constant', 'datatype', 'defaultGraph', 'graph', 'graphMap', 'inverseExpression', 'joinCondition', 'language', 'object', 'objectMap', 'parent', 'parentTriplesMap', 'predicate', 'predicateMap', 'predicateObjectMap', 'subject', 'subjectMap', 'template', 'termType'],
  rml: ['BaseSource', 'JSONPath', 'LogicalSource', 'XPath', 'iterator', 'logicalSource', 'reference', 'reference', 'referenceFormulation', 'referenceFormulation', 'source', 'version'],
};

for (const ns of iris) {
  iris[ns] = Object.fromEntries(ns[iris].map(name => ([name, namespaces[ns] + name])));
}

module.exports = iris;
