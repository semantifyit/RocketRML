const testFolder = './tests/RMLio-testCases';
const parser = require('../../index.js');
const fs = require('fs');

fs.readdirSync(testFolder).forEach(async file => {
    let options={};
    let ttlPAth='./tests/RMLio-testCases/'+file+'/mapping.ttl';
    let mapfile=fs.readFileSync(ttlPAth,'utf8');
    //let regex = /rml:source "/;

    //let modified=mapfile.replace(regex, 'rml:source "./tests/RMLio-testCases/'+file+'/');

    //fs.writeFileSync('./tests/RMLio-testCases/'+file+'/mapping.ttl',modified);
    let result = await parser.parseFile('./tests/RMLio-testCases/'+file+'/mapping.ttl', './tests/RMLio-testCases/'+file+'/out.json', options).catch((err) => {
        console.log(err);
    });
    console.log(result);
});

let testSingle = async (dir,options) => {
    let result = await parser.parseFile('./tests/RMLio-testCases/' + dir + '/mapping.ttl', './tests/RMLio-testCases/' + dir + '/out.json', options).catch((err) => {
        console.log(err);
    });
    console.log(result);
};

testSingle('RMLTC0003c-JSON');