const helper = require('./helper.js');
const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const functionHelper = require('../function/function.js');
const XMLParser = require('./XMLParser.js');

let count = 0;

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
  console.log('***************************')
  let currentID=currObject['@id'];
   for (let entry of data){
     let temp=prefixhelper.checkAndRemovePrefixesFromObject(entry, prefixes);
     if(temp.parentTriplesMap){
       let childMapID=temp.parentTriplesMap['@id'];
       console.log(childMapID);
     }
   }

  //get subjectmapping
  const subjectMapId = currObject.subjectMap['@id'];
  if (!subjectMapId) {
    throw ('Error: one subjectMap needed!');
  }
  const subjectMap = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data, subjectMapId), prefixes);



};

const calculateTemplate = (Parser, file, path, template, prefixes) => {
  const beg = helper.locations('{', template);
  const end = helper.locations('}', template);
  const words = [];
  const toInsert = [];
  const templates = [];
  for (const i in beg) {
    words.push(template.substr(beg[i] + 1, end[i] - beg[i] - 1));
  }
  words.forEach((w) => {
    const temp = helper.addArray(Parser.getData(`${path}/${w}`, file));
    toInsert.push(temp);
  });
  const allComb = helper.allPossibleCases(toInsert);
  for (const combin in allComb) {
    let finTemp = template;
    for (const found in allComb[combin]) {
      finTemp = finTemp.replace(`{${words[found]}}`, helper.toURIComponent(allComb[combin][found]));
    }
    templates.push(finTemp);
  }
  for (const t in templates) {
    templates[t] = helper.replaceEscapedChar(prefixhelper.replacePrefixWithURL(templates[t], prefixes));
  }
  return templates;
};


module.exports.parseFile = parseFile;
