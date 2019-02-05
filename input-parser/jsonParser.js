const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const functionHelper = require('../function/function.js');
const logicalSource = require('../input-parser/logicalSourceParser.js');
const helper = require('./helper.js');
const fs = require('fs');


let {JSONPath} = require("jsonpath-plus");

const parseJSON=(data,currObject,prefixes,source, iterator,options)=>{
    console.log('Reading file...');
    let file = JSON.parse(fs.readFileSync(source,"utf-8"));
    return iterateFile(data,currObject,prefixes,iterator,file,iterator,options);
};

function iterateFile(data, currObject, prefixes, iterator, file,nextIterator,options) {
    //check if it is a nested mapping, or a function
    if(currObject.functionValue) {
        let functionMap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,currObject.functionValue['@id']),prefixes);
        let definition=functionHelper.findDefinition(data,functionMap.predicateObjectMap,prefixes);
        let parameters=functionHelper.findParameters(data,functionMap.predicateObjectMap,prefixes);
        let calcParameters=helper.calculateParameters(file,parameters,'JSONPath');

        return functionHelper.executeFunction(definition,calcParameters,options);

    }
    let subjectMapId= currObject.subjectMap['@id'];
    let subjectMap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,subjectMapId),prefixes);
    let subjectClass=undefined;
    if(subjectMap.class){
        subjectClass=prefixhelper.replacePrefixWithURL(subjectMap.class['@id'],prefixes);
    }
    if(subjectMap.type){
        subjectClass=prefixhelper.replacePrefixWithURL(subjectMap.type['@id'],prefixes);
    }
    let functionMap=objectHelper.findIdinObjArr(data,subjectClass);

    let iteratorNodes;
    if(iterator){
        iteratorNodes = JSONPath({path: iterator, json: file});
    }else{
        iteratorNodes=file;
    }
    if(!iteratorNodes.length){
        iteratorNodes=[iteratorNodes];
    }

    let result=[];
    let type=subjectClass;
    if(subjectMap.termType && subjectMap.termType['@id']==='rr:BlankNode'){
        //BlankNode
        iteratorNodes.forEach(function(n){
            if(functionMap){
                //the subjectMapping contains a functionMapping
                type=helper.subjectFunctionExecution(functionMap,n,prefixes,data,'JSONPath');
            }
            let nodes=JSONPath({path: '$', json: n});
            let obj={};
            nodes.forEach(function(){
                obj['@type']=type;
                obj=doObjectMappings(currObject,data,iterator,prefixes,n,obj,nextIterator,options);
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
            let nodes=JSONPath({path: jsonpath, json: n});
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
                obj=doObjectMappings(currObject,data,iterator,prefixes,n,obj,nextIterator,options);
                result.push(obj);
            });
        });
    }
    if(result.length===1){
        result=result[0];
    }
    return result;
}


function doObjectMappings(currObject, data, iterator, prefixes, node, obj,fullIterator,options) {
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
                let ns = JSONPath({path: '$.'+reference, json: node});
                let arr=[];
                ns.forEach(function(n){
                    arr.push(n)
                });
                if(arr.length>0){
                    if(arr.length===1){
                        arr=arr[0];
                    }
                    if(obj[predicate]){
                        obj[predicate]=[obj[predicate]];
                        obj[predicate].push(arr);
                    }else{
                        obj[predicate]=arr;
                    }
                }
            }else if(constant) {
                if(constant.length===1){
                    constant=constant[0];
                }
                if(obj[predicate]){
                    obj[predicate]=[obj[predicate]];
                    obj[predicate].push(constant);
                }else{
                    obj[predicate]=constant;
                };
            }else{
                if(objectmap.parentTriplesMap &&objectmap.parentTriplesMap['@id']){
                    let nestedMapping=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,objectmap.parentTriplesMap['@id']),prefixes);
                    if(!nestedMapping.logicalSource){
                        throw(nestedMapping['@id']+' has no logicalSource')
                    }else{
                        //let nextSource=nestedMapping.logicalSource;
                        let nextSource = logicalSource.parseLogicalSource(data, prefixes, nestedMapping.logicalSource['@id']);
                        let nextIterator =nextSource.iterator;
                        let iteratorExtension=undefined;
                        let diff=nextIterator.replace(fullIterator,'');
                        if(diff && diff!==''){
                            iteratorExtension=helper.cleanString(diff);
                        }
                        if(obj[predicate]){
                            obj[predicate]=[obj[predicate]];
                            obj[predicate].push(iterateFile(data,nestedMapping,prefixes,iteratorExtension,node,nextIterator,options));
                        }else{
                            obj[predicate]=iterateFile(data,nestedMapping,prefixes,iteratorExtension,node,nextIterator,options);
                        }

                    }

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
    let ns = JSONPath({path: '$.'+path, json: object});
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