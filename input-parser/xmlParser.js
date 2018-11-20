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
        suffix=suffix.replace('{','/').replace('}',''); //TODO: nicer way of removing brackets
        let xp=iterator+suffix;
        console.log('Getting all nodes for the subject-map...');
        let nodes = xpath.select(xp, doc);
        console.log('Got all nodes for the subject-map!');
        nodes.forEach(function(n){
            let obj={};
            obj['@id']=prefix+n.nodeValue;
            obj['@type']=subjectClass;
            result.push(obj);
            //doObjectMappings()//TODO!
            //console.log(JSON.stringify(node,null,2));
        });
    }
    console.log(JSON.stringify(result,null,2));
};

let getAttribute=(xml, suffix) =>{

};

let doObjectMappings=(currObject,data)=>{
    //find objectMappings
    //TODO: handle objectmapping - create output;
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

            /*
            * predicate has e.g schema:name
            * refetrence has the additional xpath of the reference (e.g. Person/FirstName)
            * */

        });
    }
};

module.exports.parseXML=parseXML;