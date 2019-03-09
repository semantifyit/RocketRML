const parser = require('./index.js');

const run= async () => {
    let result = await
        parser.parseFile('./testMap.ttl', './out.json', {}).catch((err) => {
            console.log(err);
        });
   // console.log(result);
};

run();