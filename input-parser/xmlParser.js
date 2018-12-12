const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const functionHelper = require('../function/function.js');
const fs = require('fs');

const xpath = require('xpath')
    , dom = require('xmldom').DOMParser;

const parseXML = (data,currObject,prefixes,source, iterator)=>{
    console.log('Reading file...');
    let file = fs.readFileSync(source,"utf-8");
    console.log('Creating DOM...');
    let doc = new dom().parseFromString(file);
    console.log('DOM created!');
    let result= iterateDom(data,currObject,prefixes,iterator,doc);
    return result;
};

const iterateDom = (data,currObject,prefixes,iterator,doc) =>{
    //check if it is a nested mapping, or a function
    if(currObject.functionValue) {
        let functionMap=objectHelper.findIdinObjArr(data,currObject.functionValue['@id']);
        functionMap=prefixhelper.checkAndRemovePrefixesFromObject(functionMap,prefixes);
        let definition=functionHelper.findDefinition(data,functionMap.predicateObjectMap,prefixes);
        let parameters=functionHelper.findParameters(data,functionMap.predicateObjectMap,prefixes);

        let calcParameters=calculateParameters(doc,parameters);

        return functionHelper.executeFunction(definition,calcParameters);

    }
    let iteratorNodes ;
    if(iterator===undefined){
        iteratorNodes = doc;
        if(!iteratorNodes.length){
            iteratorNodes=[iteratorNodes];
        }
    }else{
        iteratorNodes = xpath.select(iterator, doc);
    }

    let subjectMapId= currObject.subjectMap['@id'];
    let subjectMap=objectHelper.findIdinObjArr(data,subjectMapId);
    subjectMap=prefixhelper.checkAndRemovePrefixesFromObject(subjectMap,prefixes);
    let subjectClass=subjectMap.class['@id'];
    let functionMap=objectHelper.findIdinObjArr(data,subjectClass);
    subjectClass=prefixhelper.replacePrefixWithURL(subjectClass,prefixes);
    let result=[];
    let type=subjectClass;
    if(subjectMap.termType){
        //we concider only BlankNode
        iteratorNodes.forEach(function(n){
            if(functionMap){
                //the subjectMapping contains a functionMapping
                type=subjectFunctionExecution(functionMap,n,prefixes,data);
            }
            let obj={};
            obj['@type']=type;
            obj=doObjectMappings(currObject,data,iterator,prefixes,n,obj);
            result.push(obj);
        });
    }else{
        let template=subjectMap.template;
        let suffix=prefixhelper.checkAndRemovePrefixesFromStringWithBr(template,prefixes);
        let prefix=template.replace(suffix,'');
        suffix=suffix.replace('{','').replace('}',''); //TODO: nicer way of removing brackets
        let xp=suffix;
        iteratorNodes.forEach(function(node){
            let obj={};
            let nodes=xpath.select(xp,node);

            if(prefixes[prefix.replace(':','')]){
                prefix=prefixes[prefix.replace(':','')];
            }

            if(nodes.length>1){
                nodes=[nodes[0]];
                console.warn('WARNING: multiple subjectmap ID\'s found, choosing first one!');
            }
            if(nodes.length===0){
                console.warn('WARNING: no subjectMap found for xpath: '+suffix+', skipping this one.');
            }
            if(nodes.length===1){
                if(functionMap){
                    type=subjectFunctionExecution(functionMap,node,prefixes,data);
                }
                let currID=undefined;
                if(nodes[0].nodeValue){
                    currID=nodes[0].nodeValue;
                }else if(nodes[0].firstChild && nodes[0].firstChild.nodeValue){
                    currID=nodes[0].firstChild.nodeValue;
                }
                obj['@id']=prefix+currID;
                obj['@type']=type;
                obj=doObjectMappings(currObject,data,iterator,prefixes,node,obj);
                result.push(obj);
            }
        });
    }
    if(result.length===1){
        result=result[0];
    }
    if(result.length===0){
        result=undefined;
    }
    return result;
};

let doObjectMappings=(currObject,data,iterator,prefixes,node,obj)=>{
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
                obj[predicate]=getData(reference,node);
            }else if(constant) {
                obj[predicate]=constant;
            }else{
                if(objectmap.parentTriplesMap &&objectmap.parentTriplesMap['@id']){
                    let nestedMapping=objectHelper.findIdinObjArr(data,objectmap.parentTriplesMap['@id']);
                    nestedMapping=prefixhelper.checkAndRemovePrefixesFromObject(nestedMapping,prefixes);
                    obj[predicate]=iterateDom(data,nestedMapping,prefixes,undefined,node);
                }
            }

        });
    }
    return obj;
};

const calculateParameters=(object,parameters)=>{
    let result=[];
    parameters.forEach(function(p){
        let temp=[];
        if(p.type==='constant'){
            temp.push(p.data);
        }else if(p.type==='reference'){
            temp=getData(p.data,object)
        }
        result.push(temp);
    });
    return result;
};

const getData=(path,object)=>{
//make the xpath query
    let temp=xpath.select(path, object);
    let arr=[];
    temp.forEach(function(n){
        if(n.nodeValue){
            arr.push(n.nodeValue);
        }else{
            let children=n.childNodes;
            if(children){
                for (let i=0; i<children.length; i++){
                    let c=children[i];
                    if(c.data){
                        arr.push(c.data);
                    }
                }
            }
        }

    });
    if(arr.length>0){
        if(arr.length===1){
            arr=arr[0];
        }
        return arr;
    }else{
       return undefined;
    }
};

const subjectFunctionExecution=(functionMap,node,prefixes,data)=>{
    functionMap=prefixhelper.checkAndRemovePrefixesFromObject(functionMap,prefixes);
    functionMap=objectHelper.findIdinObjArr(data,functionMap.parentTriplesMap['@id']);
    functionMap=prefixhelper.checkAndRemovePrefixesFromObject(functionMap,prefixes);
    let functionValue=objectHelper.findIdinObjArr(data,functionMap.functionValue['@id']);
    functionValue=prefixhelper.checkAndRemovePrefixesFromObject(functionValue,prefixes);
    let definition=functionHelper.findDefinition(data,functionValue.predicateObjectMap,prefixes);
    let parameters=functionHelper.findParameters(data,functionValue.predicateObjectMap,prefixes);

    let params=calculateParameters(node,parameters);
    return functionHelper.executeFunction(definition,params)
};


module.exports.parseXML=parseXML;