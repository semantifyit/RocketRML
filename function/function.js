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


const replaceDataWithValues=(dataString,params)=> {
    let result=dataString;
    let regex = /data.*?;/gi;
    const found= dataString.match(regex);
    if(found){
        found.forEach(function(r){
            let arrPos=r.replace('data','').replace(/]/g,'').replace(';','');
            arrPos=arrPos.split('[');
            const filtered = arrPos.filter(function (el) {
                return el !== null && el !== '';
            });
            let data=JSON.parse(JSON.stringify(params));
            if(filtered){
                filtered.forEach(function(d){
                    data=data[d];
                });
                result=result.replace(r, data )
            }
        });
    }
    return result;

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
            if(fun.constant){
                let funId = fun.constant['@id'];
                let funName=prefixhelper.replacePrefixWithURL(funId,prefixes);
                result={
                    type:'predefined',
                    funName:funName
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
            if(param[type].length===1){
                param[type]=param[type][0];
            }
            result.push({
                type:type,
                data:param[type],
            });
        }
    });
    return result;
};

const executeFunction=(definition,parameters,options)=>{
    let result=undefined;
    switch(definition.type){
        case 'javascript':
            result=executeJavascriptFunction(definition.funString,parameters);
            break;
        case 'predefined':
            let funName=definition.funName;
            if(options && options.functions && options.functions[funName]){
                result = options.functions[funName](parameters);
            }else{
                result = predefined.predefinedFunctions[funName](parameters);
            }
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

    let header=undefined;
    let body=undefined;

    if(data.header){
        header=JSON.parse(JSON.stringify(data.header));
        header=replaceDataWithValues(header,parameters);
        try{
            header=JSON.parse(header);
        } catch(err) {
         // I want application to not crush, but don't care about the message
     }
    }
    if(data.body){
        body=JSON.parse(JSON.stringify(data.body));
        body=replaceDataWithValues(body,parameters);
        try{
            body=JSON.parse(body);
        } catch(err) {
            // I want application to not crush, but don't care about the message
        }
    }
    try{
        let res = request(data.method, data.url,{
                headers: header,
                json:body
            }
        );
        let result=JSON.parse(res.getBody('utf8'));
        return getPath(result,data.result)
    }catch(err){
        console.log(err);
        console.log('Error in http request');
        return undefined;
    }

};


module.exports.findDefinition=findDefinition;
module.exports.findParameters=findParameters;
module.exports.executeFunction=executeFunction;


