const prefixhelper = require('../helper/prefixHelper.js');
const helper = require('../input-parser/helper.js');
const predefined = require('./predefined.js');

const findDefinition = (data, predicateObjectMap, prefixes) => {
  let result;
  predicateObjectMap = helper.addArray(predicateObjectMap);
  predicateObjectMap.forEach((temp) => {
    const predicate = helper.getPredicate(temp, prefixes, data);

    if (prefixhelper.checkAndRemovePrefixesFromString(predicate, prefixes) === 'executes') {
      const fun = temp.objectMap;
      if (fun.constant) {
        const funId = helper.getConstant(fun.constant, prefixes);
        const funName = prefixhelper.replacePrefixWithURL(funId, prefixes);
        result = {
          type: 'predefined',
          funName,
        };
      }
    }
  });
  return result;
};

const findParameters = (data, predicateObjectMap, prefixes) => {
  const result = [];
  predicateObjectMap = helper.addArray(predicateObjectMap);
  predicateObjectMap.forEach((temp) => {
    const predicate = helper.getPredicate(temp, prefixes, data);
    if (prefixhelper.checkAndRemovePrefixesFromString(predicate, prefixes) !== 'executes') {
      const param = temp.objectMap;
      // found a parameter
      let type;
      if (param.reference) {
        type = 'reference';
      }
      if (param.constant) {
        type = 'constant';
      }
      if (param.template) {
        type = 'template';
      }
      if (param.functionValue) {
        type = 'functionValue';
      }
      if (param[type] && param[type].length === 1) {
        param[type] = param[type][0];
      }
      result.push({
        type,
        data: param[type],
        predicate,
      });
    }
  });
  return result;
};

const executeFunction = async (definition, parameters, options) => {
  let result;
  if (definition.type === 'predefined') {
    const funName = definition.funName;
    if (options && options.functions && options.functions[funName]) {
      result = await options.functions[funName](parameters);
    } else {
      result = predefined.predefinedFunctions[funName](parameters);
    }
  }
  return result;
};

module.exports.findDefinition = findDefinition;
module.exports.findParameters = findParameters;
module.exports.executeFunction = executeFunction;
