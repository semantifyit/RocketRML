const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const fs = require('fs');

let jp = require('JSONPath');

const parseJSON=(data,currObject,prefixes,source, iterator)=>{
    console.log('Reading file...');
    let file = JSON.parse(fs.readFileSync(source,"utf-8"));
    let result=iterateFile(data,currObject,prefixes,iterator,file);
    return result;
};

function iterateFile(data, currObject, prefixes, iterator, file) {
    let subjectMapId= currObject.subjectMap['@id'];
    let subjectMap=objectHelper.findIdinObjArr(data,subjectMapId);
    subjectMap=prefixhelper.checkAndRemovePrefixesFromObject(subjectMap,prefixes);
    let subjectClass=subjectMap.class['@id'];
    subjectClass=prefixhelper.replacePrefixWithURL(subjectClass,prefixes);

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

    if(subjectMap.termType){
        //BlankNode for example
        iteratorNodes.forEach(function(n){
            let nodes = jp.eval(n,'$');
            let obj={};
            nodes.forEach(function(){
                obj['@type']=subjectClass;
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
                obj['@id']=prefix+node;
                obj['@type']=subjectClass;
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
            let mapping=objectHelper.findIdinObjArr(data,id);
            mapping=prefixhelper.checkAndRemovePrefixesFromObject(mapping,prefixes);
            let predicate=mapping.predicate['@id'];
            predicate=prefixhelper.replacePrefixWithURL(predicate,prefixes);
            let objectmap=objectHelper.findIdinObjArr(data,mapping.objectMap['@id']);
            objectmap=prefixhelper.checkAndRemovePrefixesFromObject(objectmap,prefixes);
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
                    let nestedMapping=objectHelper.findIdinObjArr(data,objectmap.parentTriplesMap['@id']);
                    nestedMapping=prefixhelper.checkAndRemovePrefixesFromObject(nestedMapping,prefixes);
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


module.exports.parseJSON=parseJSON;