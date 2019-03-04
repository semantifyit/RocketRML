const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const functionHelper = require('../function/function.js');
const xmlParser= require('./xmlParser');
const jsonParser= require('./jsonParser');

const subjectFunctionExecution=(functionMap,node,prefixes,data,type)=>{
    functionMap=prefixhelper.checkAndRemovePrefixesFromObject(functionMap,prefixes);
    functionMap=objectHelper.findIdinObjArr(data,functionMap.parentTriplesMap['@id']);
    functionMap=prefixhelper.checkAndRemovePrefixesFromObject(functionMap,prefixes);
    let functionValue=objectHelper.findIdinObjArr(data,functionMap.functionValue['@id']);
    functionValue=prefixhelper.checkAndRemovePrefixesFromObject(functionValue,prefixes);
    let definition=functionHelper.findDefinition(data,functionValue.predicateObjectMap,prefixes);
    let parameters=functionHelper.findParameters(data,functionValue.predicateObjectMap,prefixes);

    let params=calculateParameters(node,parameters,type);
    return functionHelper.executeFunction(definition,params)
};

const calculateParameters=(object,parameters,type)=>{
    let result=[];
    parameters.forEach(function(p){
        let temp=[];
        if(p.type==='constant'){
            temp.push(p.data);
        }else if(p.type==='reference'){
            switch(type){
                case 'XPath':
                    temp=xmlParser.getData(p.data,object);
                    break;
                case 'JSONPath':
                    temp=jsonParser.getData(p.data,object);
                    break;
            }

        }
        if(temp && temp.length===1){
            temp=temp[0];
        }
        result.push(temp);
    });
    return result;
};

const cleanString=(path)=>{
    if(path.startsWith('.')||path.startsWith('/')){
        path=path.substr(1);
    }
    return path;
};

const setObjPredicate=(obj,predicate,data,language,datatype)=>{
    if(datatype){
        datatype=datatype['@id']?datatype['@id']:datatype;
    }
    if(language || datatype){
        if(obj[predicate]) {
            let newObj={
                '@type':datatype,
                '@value':data,
                '@language' : language,
            };
            if(typeof obj[predicate]==='object' && obj[predicate]['@value']){
                let temp=obj[predicate];
                obj[predicate]=[];
                obj[predicate].push(temp);
                obj[predicate].push(newObj);
            }else if(Array.isArray(obj[predicate])){
                obj[predicate].push(newObj);
            }else{
                let temp={
                    '@value':obj[predicate]
                };
                obj[predicate]=[];
                obj[predicate].push(temp);
                obj[predicate].push(newObj);
            }
        }else{
            obj[predicate] = {};
            obj[predicate]['@value'] = data;
            obj[predicate]['@type'] = datatype;
            obj[predicate]['@language'] = language;
        }
    }else{
        if(obj[predicate]){
            Array.isArray(obj[predicate]) ? obj[predicate]=obj[predicate]:obj[predicate]=[obj[predicate]];
            if(typeof obj[predicate][0]==='object'){
                obj[predicate].push({
                    '@value':data
                });
            }else{
                obj[predicate].push(data);
            }
        }else{
            obj[predicate]=data;
        }
    }
};

const locations=(substring,string)=>{
    let a=[],i=-1;
    while((i=string.indexOf(substring,i+1)) >= 0) a.push(i);
    return a;
};

const getConstant=(constant,prefixes)=>{
    if(constant['@id']){
       return prefixhelper.replacePrefixWithURL(constant['@id'],prefixes)
    }else{
        return constant
    }
};

const cutArray=(arr)=>{
    if(arr.length===1){
        arr=arr[0];
    }
    return arr;
};

const addArray=(arr)=>{
    if(!Array.isArray(arr)){
        arr=[arr];
    }
    return arr;
};

const addToObj=(obj,pred,data)=>{
    if(obj[pred]){
        let temp=obj[pred];
        obj[pred]=[];
        obj[pred].push(temp);
        obj[pred].push(data);
    }else{
        obj[pred]=data;
    }
};



const isURL=(str)=> {
    let pattern = new RegExp('^(https?:\\/\\/)?'+
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+
        '((\\d{1,3}\\.){3}\\d{1,3}))'+
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+
        '(\\?[;&a-z\\d%_.~+=-]*)?'+
        '(\\#[-a-z\\d_]*)?$','i');
    return pattern.test(str);
};

const addBase=(str,prefixes)=>{
    return prefixes.base+str;
};

const escapeChar=(str)=>{
    str=replaceAll(str,'\\\\{','#replaceOpenBr#');
    str=replaceAll(str,'\\\\}','#replaceClosingBr#');
    return str
};

const replaceEscapedChar=(str)=>{
    str=replaceAll(str,'#replaceOpenBr#','{');
    str=replaceAll(str,'#replaceClosingBr#','}');
    return str
};

const replaceAll =(str, search, replacement) =>{
    return str.replace(new RegExp(search, 'g'), replacement);
};

const toURIComponent=(str)=>{
    str=encodeURIComponent(str);
    str=str.replace(/\(/g,'%28');
    str=str.replace(/\)/g,'%29');
    return str;
};


module.exports.escapeChar=escapeChar;
module.exports.toURIComponent=toURIComponent;
module.exports.replaceEscapedChar=replaceEscapedChar;
module.exports.subjectFunctionExecution=subjectFunctionExecution;
module.exports.calculateParameters=calculateParameters;
module.exports.cleanString=cleanString;
module.exports.locations=locations;
module.exports.cutArray=cutArray;
module.exports.addArray=addArray;
module.exports.addToObj=addToObj;
module.exports.isURL=isURL;
module.exports.addBase=addBase;
module.exports.getConstant=getConstant;
module.exports.setObjPredicate=setObjPredicate;
