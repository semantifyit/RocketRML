const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const functionHelper = require('../function/function.js');
const logicalSource = require('../input-parser/logicalSourceParser.js');
const helper = require('./helper.js');
const fs = require('fs');


let {JSONPath} = require("jsonpath-plus");

const parseJSON=(data,currObject,prefixes,source, iterator,options)=>{
    let file;
    if(options && options.inputFiles){
        source=source.replace('./','');
        if(!options.inputFiles[source]){
            throw('File '+source+' not specified!')
        }
        file=JSON.parse(options.inputFiles[source]);
    }else{
        console.log('Reading file...');
        file = JSON.parse(fs.readFileSync(source,"utf-8"));

    }
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
        let sB=template.indexOf('{');
        let eB=template.indexOf('}');
        let prefix=template.substr(0, sB);
        let suffix=template.substr(eB+1, template.length);
        let middle=template.substr(sB+1, eB-sB-1);
        let jsonpath='$.'+middle;
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
                obj['@id']=prefix+node+suffix;
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
            let predicate=undefined;
            if(mapping.predicate){
                predicate=prefixhelper.replacePrefixWithURL(mapping.predicate['@id'],prefixes);
            }else{
                if(mapping.predicateMap){
                    predicate=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,mapping.predicateMap['@id']),prefixes);
                    predicate=predicate.constant['@id'];
                }else{
                    throw('doObjectMappings(): no predicate specified!');
                }
            }
            predicate=prefixhelper.replacePrefixWithURL(predicate,prefixes);
            let objectmap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,mapping.objectMap['@id']),prefixes);

            let reference=objectmap.reference;
            let constant=objectmap.constant;
            let language=objectmap.language;
            let datatype=objectmap.datatype;

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
                    helper.setObjPredicate(obj,predicate,arr,language,datatype);
                }
            }else if(constant) {
                if(constant.length===1){
                    constant=constant[0];
                }
                helper.setObjPredicate(obj,predicate,constant,language,datatype);
            }else{
                if(objectmap.parentTriplesMap &&objectmap.parentTriplesMap['@id']){
                    let nestedMapping=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,objectmap.parentTriplesMap['@id']),prefixes);
                    if(!nestedMapping.logicalSource && !nestedMapping.functionValue){
                        throw(nestedMapping['@id']+' has no logicalSource')
                    }else{
                        let nextSource;
                        if(nestedMapping.functionValue){
                            let temp=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,nestedMapping.functionValue['@id']),prefixes);
                            if(!temp.logicalSource){
                                throw(temp['@id']+' has no logicalSource');
                            }
                            nextSource = logicalSource.parseLogicalSource(data, prefixes, temp.logicalSource['@id']);

                        }else{
                            nextSource = logicalSource.parseLogicalSource(data, prefixes, nestedMapping.logicalSource['@id']);
                        }
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