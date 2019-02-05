const pathIn='./mapping.ttl';
const pathOut='./out.json';
const rml = require('./index.js');
let options={
     compress: {
        '@vocab':"http://example.com/"
    }
    //replace:{
    //    baseEntry:0 //First element in array is used as output
    //},
    //baseMapping:['rlb:#Mapping','rlb:#PHOTOMapping']
};

rml.parseFile(pathIn, pathOut,options).then(function(result){
        console.log('SUCCESS');
        console.log(result);
    },
    function(err){
        console.log('ERROR');
        console.log(err);
    });