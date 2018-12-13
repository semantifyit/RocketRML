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
        result.push(temp);
    });
    return result;
};


module.exports.subjectFunctionExecution=subjectFunctionExecution;
module.exports.calculateParameters=calculateParameters;
