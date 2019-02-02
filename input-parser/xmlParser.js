const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
const functionHelper = require('../function/function.js');
const logicalSource = require('../input-parser/logicalSourceParser.js');
const helper = require('./helper.js');
const fs = require('fs');

const xpath = require('xpath')
    , dom = require('xmldom').DOMParser;

const parseXML = (data,currObject,prefixes,source, iterator)=>{
    console.log('Reading file...');
    let file = fs.readFileSync(source,"utf-8");
    console.log('Creating DOM...');
    let doc = new dom().parseFromString(file);
    console.log('DOM created!');
    return iterateDom(data,currObject,prefixes,iterator,doc,iterator);
};

const iterateDom = (data,currObject,prefixes,iterator,doc,nextIterator) =>{
    //check if it is a nested mapping, or a function
    if(currObject.functionValue) {
        let functionMap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,currObject.functionValue['@id']),prefixes);
        let definition=functionHelper.findDefinition(data,functionMap.predicateObjectMap,prefixes);
        let parameters=functionHelper.findParameters(data,functionMap.predicateObjectMap,prefixes);
        let calcParameters=helper.calculateParameters(doc,parameters,'XPath');

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
    let subjectMap=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,subjectMapId),prefixes);
    let subjectClass=prefixhelper.replacePrefixWithURL(subjectMap.class['@id'],prefixes);
    let functionMap=objectHelper.findIdinObjArr(data,subjectClass);

    let result=[];
    let type=subjectClass;
    if(subjectMap.termType){
        //we concider only BlankNode
        iteratorNodes.forEach(function(n){
            if(functionMap){
                //the subjectMapping contains a functionMapping
                type=helper.subjectFunctionExecution(functionMap,n,prefixes,data,'XPath');
            }
            let obj={};
            obj['@type']=type;
            obj=doObjectMappings(currObject,data,iterator,prefixes,n,obj,nextIterator);
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
                    type=helper.subjectFunctionExecution(functionMap,node,prefixes,data,'XPath');
                }
                let currID=undefined;
                if(nodes[0].nodeValue){
                    currID=nodes[0].nodeValue;
                }else if(nodes[0].firstChild && nodes[0].firstChild.nodeValue){
                    currID=nodes[0].firstChild.nodeValue;
                }
                obj['@id']=prefix+currID;
                obj['@type']=type;
                obj=doObjectMappings(currObject,data,iterator,prefixes,node,obj,nextIterator);
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

let doObjectMappings=(currObject,data,iterator,prefixes,node,obj,fullIterator)=>{
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
                obj[predicate]=getData(reference,node);
            }else if(constant) {
                if(constant.length===1){
                    constant=constant[0];
                }
                obj[predicate]=constant;
            }else{
                if(objectmap.parentTriplesMap &&objectmap.parentTriplesMap['@id']){
                    let nestedMapping=prefixhelper.checkAndRemovePrefixesFromObject(objectHelper.findIdinObjArr(data,objectmap.parentTriplesMap['@id']),prefixes);
                    if(!nestedMapping.logicalSource){
                        throw(nestedMapping['@id']+' has no logicalSource')
                    }else{
                        let nextSource = logicalSource.parseLogicalSource(data, prefixes, nestedMapping.logicalSource['@id']);
                        let nextIterator =nextSource.iterator;
                        let iteratorExtension=undefined;
                        let diff=nextIterator.replace(fullIterator,'');
                        if(diff && diff!==''){
                            iteratorExtension=helper.cleanString(diff);
                        }

                        obj[predicate]=iterateDom(data,nestedMapping,prefixes,iteratorExtension,node,nextIterator);
                    }
                }
            }

        });
    }
    return obj;
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


module.exports.parseXML=parseXML;
module.exports.getData=getData;