const prefixhelper = require('../helper/prefixHelper.js');
const objectHelper = require('../helper/objectHelper.js');
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
    let iteratorNodes = xpath.select(iterator, doc);
    //find SubjectMap
    let subjectMapId= currObject.subjectMap['@id'];
    let subjectMap=objectHelper.findIdinObjArr(data,subjectMapId);
    subjectMap=prefixhelper.checkAndRemovePrefixesFromObject(subjectMap,prefixes);
    let subjectClass=subjectMap.class['@id'];
    let result=[];
    if(subjectMap.termType){
        let xp='*';
        iteratorNodes.forEach(function(n){
            let nodes = xpath.select(xp,n);
            let obj={};
            nodes.forEach(function(){
                obj['@type']=subjectClass;
                obj=doObjectMappings(currObject,data,iterator,prefixes,n,obj);
                result.push(obj);
            });
        });
    }else{
        let template=subjectMap.template;
        let suffix=prefixhelper.checkAndRemovePrefixesFromString(template,prefixes);
        let prefix=template.replace(suffix,'');
        suffix=suffix.replace('{','').replace('}',''); //TODO: nicer way of removing brackets
        let xp=suffix;
        iteratorNodes.forEach(function(n){
            let nodes = xpath.select(xp,n);
            let obj={};
            nodes.forEach(function(node){
                obj['@id']=prefix+node.nodeValue;
                obj['@type']=subjectClass;
                obj=doObjectMappings(currObject,data,iterator,prefixes,n,obj);
                result.push(obj);
            });

        });
    }
    return result;
};

//TODO: find way to merge this function with other
let iterateNode=(data, currObject, prefixes, node) =>{
    let subjectMapId= currObject.subjectMap['@id'];
    let subjectMap=objectHelper.findIdinObjArr(data,subjectMapId);
    subjectMap=prefixhelper.checkAndRemovePrefixesFromObject(subjectMap,prefixes);
    let subjectClass=subjectMap.class['@id'];
    let obj={};
    obj['@type']=subjectClass;
    //node=xpath.select('/',node);
    obj= doObjectMappings(currObject,data,'',prefixes,node,obj);
    return obj;
};

let doObjectMappings=(currObject,data,iterator,prefixes,node,obj)=>{
    //find objectMappings
    if(currObject.predicateObjectMap){
        let objectMapArray= currObject.predicateObjectMap;
        objectMapArray.forEach(function(o){
            let id=o['@id'];
            let mapping=objectHelper.findIdinObjArr(data,id);
            mapping=prefixhelper.checkAndRemovePrefixesFromObject(mapping,prefixes);
            let predicate=mapping.predicate['@id'];
            let objectmap=objectHelper.findIdinObjArr(data,mapping.objectMap['@id']);
            objectmap=prefixhelper.checkAndRemovePrefixesFromObject(objectmap,prefixes);
            let reference=objectmap.reference;

            if (reference){
                let ns = xpath.select(reference,node);
                let arr=[];
                ns.forEach(function(n){
                    let children=n.childNodes;
                    if(children){
                        for (let i=0; i<children.length; i++){
                            let c=children[i];
                            if(c.data){
                                arr.push(c.data);
                            }
                        }

                    }
                });
                if(arr.length>0){
                    if(arr.length===1){
                        arr=arr[0];
                    }
                    obj[predicate]=arr;
                }
            }else{
                if(objectmap.parentTriplesMap &&objectmap.parentTriplesMap['@id']){
                    let nestedMapping=objectHelper.findIdinObjArr(data,objectmap.parentTriplesMap['@id']);
                    nestedMapping=prefixhelper.checkAndRemovePrefixesFromObject(nestedMapping,prefixes);
                    obj[predicate]=iterateNode(data,nestedMapping,prefixes,node);
                }
            }

        });
    }
    return obj;
};

module.exports.parseXML=parseXML;