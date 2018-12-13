const objectHelper = require('../helper/objectHelper.js');
const prefixhelper = require('../helper/prefixHelper.js');
const predefined = require('./predefined.js');
const safeEval = require('safe-eval');

const findDefinition=(data,predicateObjectMap,prefixes)=>{
    let result=undefined;
    predicateObjectMap.forEach(function(m){
        let temp=objectHelper.findIdinObjArr(data,m['@id']);
        temp=prefixhelper.checkAndRemovePrefixesFromObject(temp,prefixes);
        if(prefixhelper.checkAndRemovePrefixesFromString(temp.predicate['@id'],prefixes)==='executes'){
            let fun=objectHelper.findIdinObjArr(data,temp.objectMap['@id']);
            fun=prefixhelper.checkAndRemovePrefixesFromObject(fun,prefixes);
            //check type
            if(fun.jsFunction){
                result={
                    type:'javascript',
                    funString:fun.jsFunction
                }
            }
            if(fun.staticFunction){
                result={
                    type:'predefined',
                    funName:fun.staticFunction
                }
            }
        }
    });
    return result;

};

const findParameters=(data,predicateObjectMap,prefixes)=>{
    let result=[];
    predicateObjectMap.forEach(function(m){
        let temp=objectHelper.findIdinObjArr(data,m['@id']);
        temp=prefixhelper.checkAndRemovePrefixesFromObject(temp,prefixes);
        if(prefixhelper.checkAndRemovePrefixesFromString(temp.predicate['@id'],prefixes)!=='executes'){
            let param=objectHelper.findIdinObjArr(data,temp.objectMap['@id']);
            param=prefixhelper.checkAndRemovePrefixesFromObject(param,prefixes);
            //found a parameter
            let type=undefined;
            if(param.reference){
                type='reference';
            }
            if(param.constant){
                type='constant';
            }
            result.push({
                type:type,
                data:param[type],
            });
        }
    });
    return result;
};

const executeFunction=(definition,parameters)=>{
    let result=undefined;
    switch(definition.type){
        case 'javascript':
            result=executeJavascriptFunction(definition.funString,parameters);
            break;
        case 'predefined':
            let funName=definition.funName;
            result = predefined.predefinedFunctions[funName](parameters);
            break;
    }
    return result;
};

const executeJavascriptFunction=(functionString,parameters)=>{
    let toEvaluate=functionString;
    switch(typeof parameters){
        case 'string':
            toEvaluate+='("'+parameters.replace(/"/g,"'")+'")';
            break;
        case 'number':
            toEvaluate+='('+parameters+')';
            break;
        case 'object':
            toEvaluate+='('+JSON.stringify(parameters)+')';
            break;
        case 'undefined':
            break;

    }
    const evaluated = safeEval(toEvaluate);
    return evaluated;
};


module.exports.findDefinition=findDefinition;
module.exports.findParameters=findParameters;
module.exports.executeFunction=executeFunction;


