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
    //get the iterator nodes
    let iteratornodes = xpath.select(iterator, doc);

    //find SubjectMap
    let subjectMapId= currObject.subjectMap['@id'];
    let subjectMap=objectHelper.findIdinObjArr(data,subjectMapId);
    let result=[];

    subjectMap=prefixhelper.checkAndRemovePrefixesFromObject(subjectMap,prefixes);
    if(subjectMap.termType){
        //TODO handle different termtype (e.g. blanknode)
    }else{
        let subjectClass=subjectMap.class['@id'];

        let template=subjectMap.template;
        let suffix=prefixhelper.checkAndRemovePrefixesFromString(template,prefixes);
        let prefix=template.replace(suffix,'');
        suffix=suffix.replace('{','').replace('}',''); //TODO: nicer way of removing brackets
        let xp=suffix;
        iteratornodes.forEach(function(n){
            let nodes = xpath.select(xp,n);
            let obj={};
            nodes.forEach(function(node){
                obj['@id']=prefix+node.nodeValue;
                obj['@type']=subjectClass;
                obj=doObjectMappings(currObject,data,prefixes,n,obj);
                result.push(obj);
            });

        });
    }
    console.log(JSON.stringify(result,null,2));
};

let getAttribute=(xml, suffix) =>{

};

let doObjectMappings=(currObject,data,prefixes,node,obj)=>{
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
                ns.forEach(function(n){
                    let children=n.childNodes;
                    if(children){
                        let arr=[];
                        for (let i=0; i<children.length; i++){
                            let c=children[i];
                            if(c.data){
                                arr.push(c.data);
                            }
                        }
                        if(arr.length>0){
                            if(arr.length===1){
                                arr=arr[0];
                            }
                            obj[predicate]=arr;
                        }
                    }
                });
            }else{
                //TODO: nested call
            }

            /*
            * predicate has e.g schema:name
            * refetrence has the additional xpath of the reference (e.g. Person/FirstName)
            * */

        });
    }
    return obj;
};

module.exports.parseXML=parseXML;