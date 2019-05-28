FROM node:8

WORKDIR /src

RUN npm init -y && \
    npm i rocketrml

#COPY . /src

RUN echo '\n\
const rmlParser = require("rocketrml"); \n\
(async() => { \n\
    const result = await rmlParser.parseFile("/data/mapping.ttl", "/data/out.n3", {toRDF: true, verbose:true}).catch((err) => { \n\
        console.log(err); \n\
    });\n\
})()' > index.js

CMD node index.js
