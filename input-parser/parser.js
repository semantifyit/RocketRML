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
  // check if it is a function
  if (currObject.functionValue) {
    const functionMap = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data, currObject.functionValue['@id']), prefixes);
    const definition = functionHelper.findDefinition(data, functionMap.predicateObjectMap, prefixes);
    const parameters = functionHelper.findParameters(data, functionMap.predicateObjectMap, prefixes);
    parameters.forEach((p) => {
      p.data = `${iterator}.${p.data}`;
    });
    const calcParameters = helper.calculateParameters(file, parameters, 'JSONPath');

    return functionHelper.executeFunction(definition, calcParameters, options);
  }
  // get subjectMap
};


module.exports.parseFile = parseFile;
