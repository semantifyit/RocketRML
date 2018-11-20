const mapfile = require('./mapfile/mapfileParser.js');
const logicalSource = require('./input-parser/logicalSourceParser.js');
const xmlParser = require('./input-parser/xmlParser.js');
const objectHelper = require('./helper/objectHelper.js');
const prefixhelper = require('./helper/prefixHelper.js');

const fs = require('fs');

let start = (pathInput, pathOutput) =>{
    fs.readFile(pathInput, 'utf8', async function(err, contents) {
        let res=await mapfile.expandedJsonMap(contents);
        res.topLevelMappings.forEach(function (id){
            let o=objectHelper.findIdinObjArr(res.data,id);
            o=prefixhelper.checkAndRemovePrefixesFromObject(o,res.prefixes);
            let source= logicalSource.parseLogicalSource(res.data, res.prefixes, o.logicalSource['@id']);
            switch(source.referenceFormulation){
                case "XPath":
                    xmlParser.parseXML(res.data, o, res.prefixes, source.source,source.iterator);
                    break;
                case "JSONPath":
                    //TODO
                    break;
                default:
                    //not supported
                    throw('start(): Error during processing logicalsource: '+source.referenceFormulation+' not supported!');
            }
        });
    });

};

module.exports.start=start;