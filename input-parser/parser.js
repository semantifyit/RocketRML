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
  // TODO?

  // get subjectmapping
  const subjectMapId = currObject.subjectMap['@id'];
  if (!subjectMapId) {
    throw ('Error: one subjectMap needed!');
  }
  const subjectMap = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data, subjectMapId), prefixes);
  // get all possible things in subjectmap
  let type;
  if (subjectMap.class) {
    if (Array.isArray(subjectMap.class)) {
      type = [];
      subjectMap.class.forEach((sm) => {
        type.push(prefixhelper.replacePrefixWithURL(sm['@id'], prefixes));
      });
    } else {
      type = prefixhelper.replacePrefixWithURL(subjectMap.class['@id'], prefixes);
    }
  }
  const functionMap = objectHelper.findIdinObjArr(data, type);
  let idTemplate;
  if (subjectMap.template) {
    idTemplate = subjectMap.template;
  }
  let reference;
  if (subjectMap.reference) {
    reference = subjectMap.reference;
  }

  let constant;
  if (subjectMap.constant) {
    constant = subjectMap.constant;
  }

  let result = [];
  const iteratorNodes = Parser.docArray;
  if (reference) {
    iteratorNodes.forEach((n, i) => {
      if(functionMap){
        type=helper.subjectFunctionExecution(functionMap, n, prefixes, data, 'XPath');
      }
      const obj = {};
      count++;
      const nodes = Parser.getData(i, `${reference}`);
      nodes.forEach((node) => {
        if (type) {
          obj['@type'] = type;
        }
        let temp;
        if (node.firstChild && node.firstChild.data) {
          temp = node.firstChild.data;
        } else if (node.nodeValue) {
          temp = node.nodeValue;
        }
        temp = helper.isURL(temp) ? temp : helper.addBase(temp, prefixes);
        if (temp.indexOf(' ') === -1) {
          obj['@id'] = temp;
          // TODO obj = doObjectMappings(currObject, data, n, prefixes, doc, obj, options);

          if (!obj['@id']) {
            obj['@id'] = `${currObject['@id']}_${count}`;
          }
          // obj.$iter = p;
          obj.$ql = 'XPath';
          result.push(obj);
        }
      });
    });
  } else if (idTemplate) {
    count++;
    iteratorNodes.forEach((n, i) => {
      const obj = {};
      const ids = calculateTemplate(Parser, i, idTemplate, prefixes);
      ids.forEach((id) => {
        if (subjectMap.termType) {
          const template = prefixhelper.replacePrefixWithURL(subjectMap.termType['@id'], prefixes);
          switch (template) {
            case 'http://www.w3.org/ns/r2rml#BlankNode':
              id = `_:${id}`;
              break;
            case 'http://www.w3.org/ns/r2rml#IRI':
              if ((!idTemplate && !reference) || (idTemplate && reference)) {
                throw ('Must use exactly one of - rr:template and rr:reference in SubjectMap!');
              }
              if (!helper.isURL(id)) {
                id = helper.addBase(id, prefixes);
              }
              break;
            case 'http://www.w3.org/ns/r2rml#Literal':
              throw ('Cannot use literal in SubjectMap!');
            default:
              throw (`Don't know: ${subjectMap.termType['@id']}`);
          }
        }
        obj['@id'] = id;
        if (type) {
          obj['@type'] = type;
        }
        // TODO obj = doObjectMappings(currObject, data, `(${iterator})` + `[${i + 1}]`, prefixes, doc, obj, options);
        if (!obj['@id']) {
          obj['@id'] = `${currObject['@id']}_${count}`;
        }
        // obj.$iter = p;
        obj.$ql = 'XPath';
        result.push(obj);
      });
    });
  } else {
    // BlankNode with no template or id
    iteratorNodes.forEach((n, i) => {
      count++;
      const obj = {};
      n = helper.addArray(n);
      n.forEach(() => {
        if (constant) {
          obj['@id'] = helper.getConstant(constant, prefixes);
        }
        if (type) {
          obj['@type'] = type;
        }
        // TODO obj = doObjectMappings(currObject, data, `(${iterator})` + `[${i + 1}]`, prefixes, doc, obj, options);
        if (!obj['@id']) {
          obj['@id'] = `${currObject['@id']}_${count}`;
        }
        // obj.$iter = p;
        obj.$ql = 'XPath';
        result.push(obj);
      });
    });
  }

  result = helper.cutArray(result);
  return result;
};

const calculateTemplate = (Parser, index, template, prefixes) => {
  const beg = helper.locations('{', template);
  const end = helper.locations('}', template);
  const words = [];
  const toInsert = [];
  const templates = [];
  for (const i in beg) {
    words.push(template.substr(beg[i] + 1, end[i] - beg[i] - 1));
  }
  words.forEach((w) => {
    const temp = helper.addArray(Parser.getData(index, w));
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
