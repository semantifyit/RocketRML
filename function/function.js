const safeEval = require('safe-eval');
const request = require('sync-request');
const objectHelper = require('../helper/objectHelper.js');
const prefixhelper = require('../helper/prefixHelper.js');
const helper = require('../input-parser/helper.js');
const predefined = require('./predefined.js');

const getPath = (data, path) => {
  path = path.split('.');
  path.forEach((p) => {
    if (data[p]) {
      data = data[p];
    } else {
      return undefined;
    }
  });
  return data;
};


const replaceDataWithValues = (dataString, params) => {
  let result = dataString;
  const regex = /data.*?;/gi;
  const found = dataString.match(regex);
  if (found) {
    found.forEach((r) => {
      let arrPos = r.replace('data', '').replace(/]/g, '').replace(';', '');
      arrPos = arrPos.split('[');
      const filtered = arrPos.filter(el => el !== null && el !== '');
      let data = JSON.parse(JSON.stringify(params));
      if (filtered) {
        filtered.forEach((d) => {
          data = data[d];
        });
        result = result.replace(r, data);
      }
    });
  }
  return result;
};

const findDefinition = (data, predicateObjectMap, prefixes) => {
  let result;
  predicateObjectMap.forEach((m) => {
    const temp = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data, m['@id'], prefixes), prefixes);
    const predicate = helper.getPredicate(temp, prefixes, data);

    if (prefixhelper.checkAndRemovePrefixesFromString(predicate, prefixes) === 'executes') {
      const fun = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data, temp.objectMap['@id'], prefixes), prefixes);
      // check type
      if (fun.jsFunction) {
        result = {
          type: 'javascript',
          funString: fun.jsFunction,
        };
      }
      if (fun.staticFunction) {
        result = {
          type: 'predefined',
          funName: fun.staticFunction,
        };
      }
      if (fun.constant) {
        const funId = helper.getConstant(fun.constant, prefixes);
        const funName = prefixhelper.replacePrefixWithURL(funId, prefixes);
        result = {
          type: 'predefined',
          funName,
        };
      }
      if (fun.httpCall) {
        result = {
          type: 'httpcall',
          callDefinition: fun.httpCall,
        };
      }
    }
  });
  return result;
};

const findParameters = (data, predicateObjectMap, prefixes) => {
  const result = [];
  predicateObjectMap.forEach((m) => {
    const temp = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data, m['@id'], prefixes), prefixes);
    const predicate = helper.getPredicate(temp, prefixes, data);
    if (prefixhelper.checkAndRemovePrefixesFromString(predicate, prefixes) !== 'executes') {
      const param = prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data, temp.objectMap['@id'], prefixes), prefixes);
      // found a parameter
      let type;
      if (param.reference) {
        type = 'reference';
      }
      if (param.constant) {
        type = 'constant';
      }
      if (param[type].length === 1) {
        param[type] = param[type][0];
      }
      result.push({
        type,
        data: param[type],
      });
    }
  });
  return result;
};

const executeFunction = (definition, parameters, options) => {
  let result;
  switch (definition.type) {
    case 'javascript':
      result = executeJavascriptFunction(definition.funString, parameters);
      break;
    case 'predefined':
      const funName = definition.funName;
      if (options && options.functions && options.functions[funName]) {
        result = options.functions[funName](parameters);
      } else {
        result = predefined.predefinedFunctions[funName](parameters);
      }
      break;
    case 'httpcall':
      const data = definition.callDefinition;
      result = httpCall(data, parameters);
      break;
    default:
      break;
  }
  return result;
};

const executeJavascriptFunction = (functionString, parameters) => {
  let toEvaluate = functionString;
  switch (typeof parameters) {
    case 'string':
      toEvaluate += `("${parameters.replace(/"/g, "'")}")`;
      break;
    case 'number':
      toEvaluate += `(${parameters})`;
      break;
    case 'object':
      toEvaluate += `(${JSON.stringify(parameters)})`;
      break;
    default:
      break;
  }
  const evaluated = safeEval(toEvaluate);
  // const evaluated = eval(toEvaluate);
  return evaluated;
};

const httpCall = (data, parameters) => {
  // eslint-disable-next-line no-eval
  data = eval(`({${data}})`);

  let header;
  let body;

  if (data.header) {
    header = JSON.parse(JSON.stringify(data.header));
    header = replaceDataWithValues(header, parameters);
    try {
      header = JSON.parse(header);
    } catch (err) {
      // I want application to not crush, but don't care about the message
    }
  }
  if (data.body) {
    body = JSON.parse(JSON.stringify(data.body));
    body = replaceDataWithValues(body, parameters);
    try {
      body = JSON.parse(body);
    } catch (err) {
      // I want application to not crush, but don't care about the message
    }
  }
  try {
    const res = request(data.method, data.url, {
      headers: header,
      json: body,
    });
    const result = JSON.parse(res.getBody('utf8'));
    return getPath(result, data.result);
  } catch (err) {
    console.log(err);
    console.log('Error in http request');
    return undefined;
  }
};


module.exports.findDefinition = findDefinition;
module.exports.findParameters = findParameters;
module.exports.executeFunction = executeFunction;
