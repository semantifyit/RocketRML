const fs = require('fs');
const dom = require('xmldom').DOMParser;
const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const functionHelper = require('../function/function.js');
const xmlParser = require('./xmlParser');
const jsonParser = require('./jsonParser');


const subjectFunctionExecution = (functionMap, node, prefixes, data, type) => {
  functionMap = prefixhelper.checkAndRemovePrefixesFromObject(functionMap, prefixes);
  functionMap = objectHelper.findIdinObjArr(data, functionMap.parentTriplesMap['@id']);
  functionMap = prefixhelper.checkAndRemovePrefixesFromObject(functionMap, prefixes);
  let functionValue = objectHelper.findIdinObjArr(data, functionMap.functionValue['@id']);
  functionValue = prefixhelper.checkAndRemovePrefixesFromObject(functionValue, prefixes);
  const definition = functionHelper.findDefinition(data, functionValue.predicateObjectMap, prefixes);
  const parameters = functionHelper.findParameters(data, functionValue.predicateObjectMap, prefixes);

  const params = calculateParameters(node, parameters, type);
  return functionHelper.executeFunction(definition, params);
};

const calculateParameters = (object, parameters, type) => {
  const result = [];
  parameters.forEach((p) => {
    let temp = [];
    if (p.type === 'constant') {
      temp.push(p.data);
    } else if (p.type === 'reference') {
      switch (type) {
        case 'XPath':
          temp = xmlParser.getData(p.data, object);
          break;
        case 'JSONPath':
          temp = jsonParser.getData(p.data, object);
          break;
        default:
          throw (`Don't know: ${p.type}`);
      }
    }
    if (temp && temp.length === 1) {
      temp = temp[0];
    }
    result.push(temp);
  });
  return result;
};

const cleanString = (path) => {
  if (path.startsWith('.') || path.startsWith('/')) {
    path = path.substr(1);
  }
  return path;
};

const setObjPredicate = (obj, predicate, data, language, datatype) => {
  if (datatype) {
    datatype = datatype['@id'] ? datatype['@id'] : datatype;
  }
  if (language || datatype) {
    if (obj[predicate]) {
      const newObj = {
        '@type': datatype,
        '@value': data,
        '@language': language,
      };
      if (typeof obj[predicate] === 'object' && obj[predicate]['@value']) {
        const temp = obj[predicate];
        obj[predicate] = [];
        obj[predicate].push(temp);
        obj[predicate].push(newObj);
      } else if (Array.isArray(obj[predicate])) {
        obj[predicate].push(newObj);
      } else {
        const temp = {
          '@value': obj[predicate],
        };
        obj[predicate] = [];
        obj[predicate].push(temp);
        obj[predicate].push(newObj);
      }
    } else {
      obj[predicate] = {};
      obj[predicate]['@value'] = data;
      obj[predicate]['@type'] = datatype;
      obj[predicate]['@language'] = language;
    }
  } else if (obj[predicate]) {
    Array.isArray(obj[predicate]) ? obj[predicate] = obj[predicate] : obj[predicate] = [obj[predicate]];
    if (typeof obj[predicate][0] === 'object') {
      obj[predicate].push({
        '@value': data,
      });
    } else {
      obj[predicate].push(data);
    }
  } else {
    obj[predicate] = data;
  }
};

const locations = (substring, string) => {
  const a = []; let i = -1;
  i = string.indexOf(substring, i + 1);
  while (i >= 0) {
    a.push(i);
    i = string.indexOf(substring, i + 1);
  }
  return a;
};

const getConstant = (constant, prefixes) => {
  if (constant['@id']) {
    return prefixhelper.replacePrefixWithURL(constant['@id'], prefixes);
  }
  return constant;
};

const cutArray = (arr) => {
  if (arr.length === 1) {
    arr = arr[0];
  }
  return arr;
};

const addArray = (arr) => {
  if (!Array.isArray(arr)) {
    arr = [arr];
  }
  return arr;
};

const addToObj = (obj, pred, data) => {
  if (obj[pred]) {
    if (!Array.isArray(obj[pred])) {
      const temp = obj[pred];
      obj[pred] = [];
      obj[pred].push(temp);
    }
    obj[pred].push(data);
  } else {
    obj[pred] = data;
  }
};

const addToObjInId = (obj, pred, data) => {
  if (obj[pred]) {
    if (!Array.isArray(obj[pred])) {
      const temp = obj[pred];
      obj[pred] = [];
      obj[pred].push(temp);
    }
    obj[pred].push({ '@id': data });
  } else {
    obj[pred] = { '@id': data };
  }
};

const readFileJSON = (source, options) => {
  if (!options.cache) {
    options.cache = {};
  }
  if (options.cache[source]) {
    console.log(`Reading from cache.. : ${source}`);
    return options.cache[source];
  }
  let file;
  if (options && options.inputFiles) {
    // source = source.replace('./', '');
    if (!options.inputFiles[source]) {
      throw (`File ${source} not specified!`);
    }
    file = JSON.parse(options.inputFiles[source]);
  } else {
    console.log('Reading file...');
    file = JSON.parse(fs.readFileSync(source, 'utf-8'));
  }
  options.cache[source] = file;
  return file;
};

const getDatatypeFromPath = (path) => {
  path = path.toLowerCase();
  if (path.endsWith('.json') || path.endsWith('.jsonld')) {
    return 'json';
  }
  if (path.endsWith('.xml')) {
    return 'xml';
  }
  return undefined;
};

const readFileXML = (source, options) => {
  if (!options.cache) {
    options.cache = {};
  }
  if (options.cache[source]) {
    console.log(`Reading from cache.. : ${source}`);
    return options.cache[source];
  }
  let file;
  if (options && options.inputFiles) {
    // source = source.replace('./', '');
    if (!options.inputFiles[source]) {
      throw (`File ${source} not specified!`);
    }
    file = options.inputFiles[source];
  } else {
    console.log('Reading file...');
    file = fs.readFileSync(source, 'utf-8');
  }
  if (options && options.removeNameSpace) {
    // remove namespace from data
    console.log('Removing namespace..');
    for (const key in options.removeNameSpace) {
      const toDelete = `${key}="${options.removeNameSpace[key]}"`;
      file = file.replace(toDelete, '');
    }
  }
  console.log('Creating DOM...');
  const doc = new dom().parseFromString(file);
  console.log('DOM created!');
  options.cache[source] = doc;
  return doc;
};

const isURL = (str) => {
  const pattern = new RegExp('^(https?:\\/\\/)?'
        + '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'
        + '((\\d{1,3}\\.){3}\\d{1,3}))'
        + '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'
        + '(\\?[;&a-z\\d%_.~+=-]*)?'
        + '(\\#[-a-z\\d_]*)?$', 'i');
  return pattern.test(str);
};

const addBase = (str, prefixes) => prefixes.base + str;

const escapeChar = (str) => {
  str = replaceAll(str, '\\\\{', '#replaceOpenBr#');
  str = replaceAll(str, '\\\\}', '#replaceClosingBr#');
  return str;
};

const allPossibleCases = (arr) => {
  if (arr.length === 1) {
    return arr[0].map(e => [e]);
  }
  const result = [];
  const allCasesOfRest = allPossibleCases(arr.slice(1)); // recur with the rest of array
  for (let i = 0; i < allCasesOfRest.length; i++) {
    for (let j = 0; j < arr[0].length; j++) {
      result.push([arr[0][j], ...allCasesOfRest[i]]);
    }
  }
  return result;
};

const replaceEscapedChar = (str) => {
  str = replaceAll(str, '#replaceOpenBr#', '{');
  str = replaceAll(str, '#replaceClosingBr#', '}');
  return str;
};

const replaceAll = (str, search, replacement) => str.replace(new RegExp(search, 'g'), replacement);

const toURIComponent = (str) => {
  str = encodeURIComponent(str);
  str = str.replace(/\(/g, '%28');
  str = str.replace(/\)/g, '%29');
  return str;
};
const createMeta = (obj) => {
  if (!obj) {
    obj = {};
  }
  if (!obj.$metadata) {
    obj.$metadata = {};
  }
  if (!obj.$metadata.inputFiles) {
    obj.$metadata.inputFiles = {};
  }
  return obj;
};


module.exports.escapeChar = escapeChar;
module.exports.createMeta = createMeta;
module.exports.allPossibleCases = allPossibleCases;
module.exports.toURIComponent = toURIComponent;
module.exports.replaceEscapedChar = replaceEscapedChar;
module.exports.subjectFunctionExecution = subjectFunctionExecution;
module.exports.calculateParameters = calculateParameters;
module.exports.cleanString = cleanString;
module.exports.locations = locations;
module.exports.cutArray = cutArray;
module.exports.addArray = addArray;
module.exports.addToObj = addToObj;
module.exports.addToObjInId = addToObjInId;
module.exports.readFileJSON = readFileJSON;
module.exports.readFileXML = readFileXML;
module.exports.isURL = isURL;
module.exports.addBase = addBase;
module.exports.getConstant = getConstant;
module.exports.setObjPredicate = setObjPredicate;
module.exports.getDatatypeFromPath = getDatatypeFromPath;
