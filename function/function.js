const objectHelper = require('../helper/objectHelper.js');
const prefixhelper = require('../helper/prefixHelper.js');
const predefined = require('./predefined.js');
const safeEval = require('safe-eval');
const request = require('sync-request');

const getPath=(data,path)=> {
    path=path.split('.');
    path.forEach(function (p){
        if(data[p]){
            data=data[p];
        }else{
            return undefined;
        }

    });
    return data;
};

const findDefinition=(data,predicateObjectMap,prefixes)=>{
    let result=undefined;
    predicateObjectMap.forEach(function(m){
        let temp=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,m['@id']),prefixes);
        if(prefixhelper.checkAndRemovePrefixesFromString(temp.predicate['@id'],prefixes)==='executes'){
            let fun=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,temp.objectMap['@id']),prefixes);
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
            if(fun.httpCall){
                result={
                    type:'httpcall',
                    callDefinition:fun.httpCall
                }
            }
        }
    });
    return result;

};

const findParameters=(data,predicateObjectMap,prefixes)=>{
    let result=[];
    predicateObjectMap.forEach(function(m){
        let temp=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,m['@id']),prefixes);
        if(prefixhelper.checkAndRemovePrefixesFromString(temp.predicate['@id'],prefixes)!=='executes'){
            let param=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,temp.objectMap['@id']),prefixes);
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
        case 'httpcall':
            let data=definition.callDefinition;
            result = httpCall(data,parameters);
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

 const httpCall=(data,parameters)=>{
    data = eval('({' + data + '})');

    //TODO:headers and body with parameter;
    let header=undefined;
    let body=undefined;

    let res= request(data.method, data.url,{
            headers: header,
            body:body
            }
        );
    let result=JSON.parse(res.getBody('utf8'));
    return getPath(result,data.result)
};


module.exports.findDefinition=findDefinition;
module.exports.findParameters=findParameters;
module.exports.executeFunction=executeFunction;


