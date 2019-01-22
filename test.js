const mapfile = require('./mapfile/mapfileParser.js');
const inputparser = require('./input-parser/logicalSourceParser.js');
const xmlParser = require('./input-parser/xmlParser.js');
const objectHelper = require('./helper/objectHelper.js');
const prefixhelper = require('./helper/prefixHelper.js');
const start = require('./index.js');

const fs = require('fs');

const pathThueris='./examples/mapping.ttl';
const pathBrandenburg='./examples/mappingB.ttl';
const pathOUTBrandenburg='./examples/outB.json';
const pathOUTThueris='./examples/out.json';



start.parseFile(pathBrandenburg, pathOUTBrandenburg).then(function(result){
        console.log('SUCCESS');
        //console.log(result);
    },
    function(err){
        console.log('ERROR');
        console.log(err);
    });

let options={
    compress: {
        '@vocab':"http://schema.org/"
    },
    insert:{
        delete:[1],
        deleteFound:true,
        insertFromTo:[]
    }
};
/*
start.parseFile(pathThueris, pathOUTThueris,options).then(function(result){ //or only string for vocab
        console.log('SUCCESS');
        //console.log(result);
    },
    function(err){
        console.log('ERROR');
        console.log(err);
    });
    */