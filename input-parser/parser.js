const XMLParser = require('./XMLParser.js');

const count = 0;

const parseFile = (data, currObject, prefixes, source, iterator, options, ql) => {
  let Parser;
  switch (ql) {
    case 'XPath':
      Parser = new XMLParser.XMLParser(source, iterator, options);
      break;
    case 'JSONPath':
      // TODO
      break;
    default:
      throw (`Cannot process: ${ql}`);
  }
  return iterateFile(Parser, data, currObject, prefixes, options, ql);
};

/*
Parser: the parser object
data: the whole ttl mapfile in json

currObject: the current object from thje mapfile that is parsed
prefixes: all prefixes,
options: teh options,
ql: the querylanguage
 */

const iterateFile = (Parser, data, currObject, prefixes, options, ql) => {
  // get all dependencies (where does it have a parent?)
  console.log(currObject['@id']);
  for (let entry of data){
    if(entry.parentTriplesMap){
      console.log(entry.parentTriplesMap['@id'])
    }
  }

};


module.exports.parseFile = parseFile;
