const tags = require('language-tags');

const helper = require('./helper.js');
const prefixhelper = require('../helper/prefixHelper.js');
const functionHelper = require('../function/function.js');
const XMLParser = require('./XMLParser.js');
const JSONParser = require('./JSONParser.js');
const CSVParser = require('./CSVParser.js');
const XMLParserCPP = require('./XmlParserCpp');
const FontoxpathParser = require('./FontoxpathParser');

const { getDataFromParser } = helper;

let count = 0;

const parseFile = async (data, currObject, prefixes, source, iterator, options, ql) => {
  count = 0;
  let Parser;
  switch (ql) {
    case 'XPath':
      if (options && ((options.xmlPerformanceMode && options.xmlPerformanceMode === true)
      || (options.xpathLib && options.xpathLib === 'pugixml'))) {
        Parser = new XMLParserCPP(source, iterator, options);
      } else if (options && options.xpathLib && options.xpathLib === 'fontoxpath') {
        Parser = new FontoxpathParser(source, iterator, options);
      } else {
        Parser = new XMLParser(source, iterator, options);
      }
      break;
    case 'JSONPath':
      Parser = new JSONParser(source, iterator, options);
      break;
    case 'CSV':
      Parser = new CSVParser(source, iterator, options);
      break;
    default:
      throw (`Cannot process: ${ql}`);
  }
  const result = await iterateFile(Parser, data, currObject, prefixes, options);
  if (Parser.free) {
    Parser.free();
  }
  return result;
};


/*
Parser: the parser object
data: the whole ttl mapfile in json

currObject: the current object from thje mapfile that is parsed
prefixes: all prefixes,
options: the options,
ql: the querylanguage
 */

const writeParentPath = (Parser, index, parents, obj, options) => {
  if (!obj.$parentPaths && parents.length > 0) {
    obj.$parentPaths = {};
  }
  for (const parent of parents) {
    if (!obj.$parentPaths[parent]) {
      obj.$parentPaths[parent] = getDataFromParser(Parser, index, parent, options);
    }
  }
};

const iterateFile = async (Parser, data, currObject, prefixes, options) => {
  const parents = [];
  for (const d of data) {
    if (d.parentTriplesMap && d.parentTriplesMap['@id'] === currObject['@id'] && d.joinCondition) {
      const joinCondition = d.joinCondition;
      const parentPaths = helper.addArray(joinCondition).map(({ parent }) => parent);
      parents.push(...parentPaths);
    }
  }
  // get subjectmapping
  const subjectMap = currObject.subjectMap;
  if (!subjectMap || Array.isArray(subjectMap)) {
    throw ('Error: exacltly one subjectMap needed!');
  }
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
  const functionClassMap = (subjectMap.class && Object.keys(subjectMap.class).length > 1) ? subjectMap.class : undefined;
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
  const iteratorNumber = Parser.getCount();
  if (reference) {
    for (let i = 0; i < iteratorNumber; i++) {
      if (functionClassMap) {
        type = await helper.subjFunctionExecution(Parser, functionClassMap, prefixes, data, i, options);
      }
      let obj = {};
      count++;
      let nodes = getDataFromParser(Parser, i, reference, options);
      nodes = helper.addArray(nodes);
      // eslint-disable-next-line no-loop-func
      // needs to be done in sequence, since result.push() is done.
      // for await ()  is bad practice when we use it with something other than an asynchronous iterator - https://stackoverflow.com/questions/59694309/for-await-of-vs-promise-all
      for (let temp of nodes) {
        if (type) {
          obj['@type'] = type;
        }
        temp = helper.isURL(temp) ? temp : helper.addBase(temp, prefixes);
        if (temp.indexOf(' ') === -1) {
          obj['@id'] = temp;
          obj = await doObjectMappings(Parser, i, currObject, data, prefixes, obj, options);

          if (!obj['@id']) {
            obj['@id'] = `${currObject['@id']}_${count}`;
          }
          writeParentPath(Parser, i, parents, obj, options);
          result.push(obj);
        }
      }
    }
  } else if (idTemplate) {
    count++;
    for (let i = 0; i < iteratorNumber; i++) {
      if (functionClassMap) {
        type = await helper.subjFunctionExecution(Parser, functionClassMap, prefixes, data, i, options);
      }
      let obj = {};
      const ids = calculateTemplate(Parser, i, idTemplate, prefixes, undefined, options);
      for (let id of ids) {
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
              break;
            default:
              throw (`Don't know: ${subjectMap.termType['@id']}`);
          }
        }
        obj['@id'] = id;
        if (type) {
          obj['@type'] = type;
        }
        obj = await doObjectMappings(Parser, i, currObject, data, prefixes, obj, options);
        if (!obj['@id']) {
          obj['@id'] = `${currObject['@id']}_${count}`;
        }
        writeParentPath(Parser, i, parents, obj, options);
        result.push(obj);
      }
    }
  } else if (subjectMap.functionValue) {
    for (let i = 0; i < iteratorNumber; i++) {
      count++;
      let obj = {};
      const subjVal = await helper.subjFunctionExecution(Parser, subjectMap, prefixes, data, i, options);
      obj['@id'] = subjVal;
      if (type) {
        obj['@type'] = type;
      }
      obj = await doObjectMappings(Parser, i, currObject, data, prefixes, obj, options);
      writeParentPath(Parser, i, parents, obj, options);
      result.push(obj);
    }
  } else if (subjectMap.termType) {
    const termType = prefixhelper.replacePrefixWithURL(subjectMap.termType['@id'], prefixes);
    if (termType === 'http://www.w3.org/ns/r2rml#BlankNode') {
      // BlankNode with no template or id
      for (let i = 0; i < iteratorNumber; i++) {
        if (functionClassMap) {
          type = await helper.subjFunctionExecution(Parser, functionClassMap, prefixes, data, i, options);
        }
        count++;
        let obj = {};
        if (constant) {
          obj['@id'] = helper.getConstant(constant, prefixes);
        }
        if (type) {
          obj['@type'] = type;
        }
        obj = await doObjectMappings(Parser, i, currObject, data, prefixes, obj, options);
        if (!obj['@id']) {
          obj['@id'] = `_:${encodeURIComponent(`${currObject['@id']}_${count}`)}`;
        }
        writeParentPath(Parser, i, parents, obj, options);
        result.push(obj);
      }
    } else {
      throw new Error('????');
    }
  } else {
    throw new Error('Unsupported subjectmap');
  }

  result = helper.cutArray(result);
  return result;
};

const doObjectMappings = async (Parser, index, currObject, data, prefixes, obj, options) => {
  if (currObject.predicateObjectMap) {
    let objectMapArray = currObject.predicateObjectMap;
    objectMapArray = helper.addArray(objectMapArray);
    for (const mapping of objectMapArray) {
      const predicate = helper.getPredicate(mapping, prefixes, data);
      if (Array.isArray(predicate)) {
        for (const p of predicate) {
          await handleSingleMapping(Parser, index, obj, mapping, p, prefixes, data, options);
        }
      } else {
        await handleSingleMapping(Parser, index, obj, mapping, predicate, prefixes, data, options);
      }
    }
  }
  obj = helper.cutArray(obj);
  return obj;
};

const useLanguageMap = (Parser, index, termMap, prefixes, options) => {
  if (termMap.constant) {
    return termMap.constant;
  }
  if (termMap.reference) {
    const vals = getDataFromParser(Parser, index, termMap.reference, options);
    return helper.addArray(vals)[0];
  }
  if (termMap.template) {
    const temp = calculateTemplate(Parser, index, termMap.template, prefixes, undefined, options);
    return helper.addArray(temp)[0];
  }
  throw new Error('TermMap has neither constant, reference or template');
};

const handleSingleMapping = async (Parser, index, obj, mapping, predicate, prefixes, data, options) => {
  predicate = prefixhelper.replacePrefixWithURL(predicate, prefixes);
  let object;
  if (mapping.object) {
    object = {
      '@id': prefixhelper.replacePrefixWithURL(mapping.object['@id'], prefixes),
    };
  }
  const objectmaps = [];
  if (mapping.objectMap) {
    if (Array.isArray(mapping.objectMap)) {
      for (const t of mapping.objectMap) {
        objectmaps.push(t);
      }
    } else {
      objectmaps.push(mapping.objectMap);
    }
  }

  if (object) {
    helper.addToObj(obj, predicate, object);
  } else {
    for (const objectmap of objectmaps) {
      const reference = objectmap.reference;
      let constant = objectmap.constant;
      let language = objectmap.language;
      const datatype = helper.isURL(objectmap.datatype) ? objectmap.datatype : prefixhelper.replacePrefixWithURL(objectmap.datatype, prefixes);
      const template = objectmap.template;
      let termtype = objectmap.termType;

      if (objectmap.languageMap) {
        language = useLanguageMap(Parser, index, objectmap.languageMap, prefixes, options);
      }

      if (language) {
        if (!tags(language).valid()) {
          throw (`Language tag: ${language} invalid!`);
        }
      }

      const functionValue = objectmap.functionValue;
      if (template) {
        // we have a template definition
        const temp = calculateTemplate(Parser, index, template, prefixes, termtype, options);
        temp.forEach((t) => {
          if (termtype) {
            termtype = prefixhelper.replacePrefixWithURL(termtype, prefixes);
            switch (termtype) {
              case 'http://www.w3.org/ns/r2rml#BlankNode':
                t = {
                  '@id': `_:${t}`,
                };
                break;
              case 'http://www.w3.org/ns/r2rml#IRI':
                if (!helper.isURL(t)) {
                  t = {
                    '@id': helper.addBase(t, prefixes),
                  };
                } else {
                  t = {
                    '@id': t,
                  };
                }
                break;
              case 'http://www.w3.org/ns/r2rml#Literal':
                break;
              default:
                throw (`Don't know: ${termtype['@id']}`);
            }
          } else {
            t = {
              '@id': t,
            };
          }
          t = helper.cutArray(t);
          helper.setObjPredicate(obj, predicate, t, language, datatype);
        });
      } else if (reference) {
        // we have a reference definition
        let ns = getDataFromParser(Parser, index, reference, options);
        let arr = [];
        ns = helper.addArray(ns);
        ns.forEach((n) => {
          arr.push(n);
        });
        if (arr && arr.length > 0) {
          arr = helper.cutArray(arr);
          helper.setObjPredicate(obj, predicate, arr, language, datatype);
        }
      } else if (constant) {
        // we have a constant definition
        constant = helper.cutArray(constant);
        constant = helper.getConstant(constant, prefixes);

        if (prefixhelper.replacePrefixWithURL(predicate, prefixes) !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' && termtype && prefixhelper.replacePrefixWithURL(termtype, prefixes) === 'http://www.w3.org/ns/r2rml#IRI') {
          if (!helper.isURL(constant)) {
            constant = {
              '@id': helper.addBase(constant, prefixes),
            };
          } else {
            constant = {
              '@id': constant,
            };
          }
        }
        helper.setObjPredicate(obj, predicate, constant, language, datatype);
      } else if (objectmap.parentTriplesMap && objectmap.parentTriplesMap['@id']) {
        // we have a parentTriplesmap

        if (!obj.$parentTriplesMap) {
          obj.$parentTriplesMap = {};
        }
        if (objectmap.joinCondition) {
          const joinConditions = helper.addArray(objectmap.joinCondition);

          if (!obj.$parentTriplesMap[predicate]) {
            obj.$parentTriplesMap[predicate] = [];
          }
          obj.$parentTriplesMap[predicate].push({
            joinCondition: joinConditions.map((cond) => ({
              parentPath: cond.parent,
              child: getDataFromParser(Parser, index, cond.child, options),
            })),
            mapID: objectmap['@id'],
          });
        } else if (obj.$parentTriplesMap[predicate]) {
          obj.$parentTriplesMap[predicate].push({
            mapID: objectmap['@id'],
          });
        } else {
          obj.$parentTriplesMap[predicate] = [];
          obj.$parentTriplesMap[predicate].push({
            mapID: objectmap['@id'],
          });
        }
      } else if (functionValue) {
        const functionMap = functionValue;
        const definition = functionHelper.findDefinition(data, functionMap.predicateObjectMap, prefixes);
        const parameters = functionHelper.findParameters(data, functionMap.predicateObjectMap, prefixes);
        const calcParameters = helper.calculateParams(Parser, parameters, index, options);
        const result = await functionHelper.executeFunction(definition, calcParameters, options);
        helper.setObjPredicate(obj, predicate, result, language, datatype);
      }
    }
  }
};

const calculateTemplate = (Parser, index, template, prefixes, termType, options) => {
  if (termType) {
    termType = prefixhelper.replacePrefixWithURL(termType, prefixes);
  }

  const beg = helper.locations('{', template);
  const end = helper.locations('}', template);
  const words = [];
  const toInsert = [];
  const templates = [];
  if (beg.length === 0 || beg.length !== end.length) {
    return [template];
  }
  for (const i in beg) {
    words.push(template.substr(beg[i] + 1, end[i] - beg[i] - 1));
  }
  words.forEach((w) => {
    const temp = helper.addArray(getDataFromParser(Parser, index, w, options));
    toInsert.push(temp);
  });
  const allComb = helper.allPossibleCases(toInsert);
  for (const combin in allComb) {
    let finTemp = template;
    for (const found in allComb[combin]) {
      if (!termType || termType !== 'http://www.w3.org/ns/r2rml#Literal') {
        allComb[combin][found] = helper.toURIComponent(allComb[combin][found]);
      }
      finTemp = finTemp.replace(`{${words[found]}}`, allComb[combin][found]);
    }
    templates.push(finTemp);
  }
  for (const t in templates) {
    templates[t] = helper.replaceEscapedChar(prefixhelper.replacePrefixWithURL(templates[t], prefixes));
  }
  return templates;
};

module.exports.parseFile = parseFile;
