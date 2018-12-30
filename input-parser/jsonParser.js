const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const functionHelper = require('../function/function.js');
const helper = require('./helper.js');
const fs = require('fs');


let jp = require('JSONPath');

const parseJSON=(data,currObject,prefixes,source, iterator)=>{
    console.log('Reading file...');
    let file = JSON.parse(fs.readFileSync(source,"utf-8"));
    return iterateFile(data,currObject,prefixes,iterator,file);
};

function iterateFile(data, currObject, prefixes, iterator, file) {
    //check if it is a nested mapping, or a function
    if(currObject.functionValue) {
        let functionMap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,currObject.functionValue['@id']),prefixes);
        let definition=functionHelper.findDefinition(data,functionMap.predicateObjectMap,prefixes);
        let parameters=functionHelper.findParameters(data,functionMap.predicateObjectMap,prefixes);
        let calcParameters=helper.calculateParameters(file,parameters,'JSONPath');

        return functionHelper.executeFunction(definition,calcParameters);

    }
    let subjectMapId= currObject.subjectMap['@id'];
    let subjectMap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,subjectMapId),prefixes);
    let subjectClass=prefixhelper.replacePrefixWithURL(subjectMap.class['@id'],prefixes);
    let functionMap=objectHelper.findIdinObjArr(data,subjectClass);

    let iteratorNodes;
    if(iterator){
        iteratorNodes=jp.eval(file,iterator);
    }else{
        iteratorNodes=file;
    }
    if(!iteratorNodes.length){
        iteratorNodes=[iteratorNodes];
    }

    let result=[];
    let type=subjectClass;
    if(subjectMap.termType){
        //BlankNode for example
        iteratorNodes.forEach(function(n){
            if(functionMap){
                //the subjectMapping contains a functionMapping
                type=helper.subjectFunctionExecution(functionMap,n,prefixes,data,'JSONPath');
            }
            let nodes = jp.eval(n,'$');
            let obj={};
            nodes.forEach(function(){
                obj['@type']=type;
                obj=doObjectMappings(currObject,data,iterator,prefixes,n,obj);
                result.push(obj);
            });
        });

    }else{
        let template=subjectMap.template;
        let suffix=prefixhelper.checkAndRemovePrefixesFromStringWithBr(template,prefixes);
        let prefix=template.replace(suffix,'');
        suffix=suffix.replace('{','').replace('}',''); //TODO: nicer way of removing brackets

        let jsonpath='$.'+suffix;
        iteratorNodes.forEach(function(n){
            let obj={};
            let nodes = jp.eval(n,jsonpath);
            if(prefixes[prefix.replace(':','')]){
                prefix=prefixes[prefix.replace(':','')];
            }
            nodes.forEach(function(node){
                if(functionMap){
                    //the subjectMapping contains a functionMapping
                    type=helper.subjectFunctionExecution(functionMap,n,prefixes,data,'JSONPath');
                }
                obj['@id']=prefix+node;
                obj['@type']=type;
                obj=doObjectMappings(currObject,data,iterator,prefixes,n,obj);
                result.push(obj);
            });
        });
    }
    if(result.length===1){
        result=result[0];
    }
    return result;
}


function doObjectMappings(currObject, data, iterator, prefixes, node, obj) {
    //find objectMappings
    if(currObject.predicateObjectMap){
        let objectMapArray= currObject.predicateObjectMap;
        if(!Array.isArray(objectMapArray)){
            objectMapArray=[objectMapArray];
        }
        objectMapArray.forEach(function(o){
            let id=o['@id'];
            let mapping=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,id),prefixes);
            let predicate=prefixhelper.replacePrefixWithURL(mapping.predicate['@id'],prefixes);
            let objectmap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,mapping.objectMap['@id']),prefixes);

            let reference=objectmap.reference;
            let constant=objectmap.constant;

            if (reference){
                let ns = jp.eval(node,'$.'+reference);
                let arr=[];
                ns.forEach(function(n){
                    arr.push(n)
                });
                if(arr.length>0){
                    if(arr.length===1){
                        arr=arr[0];
                    }
                    obj[predicate]=arr;
                }
            }else if(constant) {
                obj[predicate]=constant;
            }else{
                if(objectmap.parentTriplesMap &&objectmap.parentTriplesMap['@id']){
                    let nestedMapping=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,objectmap.parentTriplesMap['@id']),prefixes);
                    obj[predicate]=iterateFile(data,nestedMapping,prefixes,undefined,node);
                }
            }

        });
    }
    if(obj.length===1){
        obj=obj[0];
    }
    return obj;
}

const getData=(path,object)=>{
    let ns = jp.eval(object,'$.'+path);
    if(ns.length>0){
        if(ns.length===1){
            ns=ns[0];
        }
        return ns;
    }else{
        return undefined;
    }
};


module.exports.parseJSON=parseJSON;
module.exports.getData=getData;