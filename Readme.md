![semantify.it](https://semantify.it/images/logo.png)

# RML-mapper
This is a javascript RML-mapper implementation for the RDF mapping language ([RML](http://rml.io/spec.html)).

## What does it support
### RML Vocabulary
the following list contains the current supported classes.


    rr:TriplesMap is the class of triples maps as defined by R2RML.
    rml:LogicalSource is the class of logical sources.
    rml:BaseSource is the class of data sources used as input source.
    rr:SubjectMap is the class of subject maps.
    rr:PredicateMap is the class of predicate maps.
    rr:ObjectMap is the class of object maps.
    rr:PredicateObjectMap is the class of predicate-object maps.
    rr:RefObjectMap is the class of referencing object maps.
    rml:referenceFormulation is the class of supported reference formulations.
    
Missing:

    rr:R2RMLView is the class of R2RML views.
    rr:BaseTableOrView is the class of SQL base tables or views.
    rr:GraphMap is the class of graph maps.
    rr:Join is the class of join conditions.
    
### XPath and JSONPath

For querying the data, [JSONPath](https://www.npmjs.com/package/JSONPath) (json) and [XPath](https://www.npmjs.com/package/xpath) (xml) are used.

## How does it work
Currently only json is supported as output.

In parseFile function in index.js is the entry point. 
It takes an input path (the mapping.ttl file) and an output path (where the json output is written).
The function returns a promise, which resolves in the resulting output, but the output is also written to the file system.


##Example
Below there is shown a very simple example with no nesting and no array.

More can be seen in the tests folder

###Input


```json
{
  "name":"Tom A.",
  "age":15
}
```


###Turtle mapfile

The mapfile must also specify the input source path.

```ttl
  @prefix rr: <http://www.w3.org/ns/r2rml#> .
  @prefix rml: <http://semweb.mmlab.be/ns/rml#> .
  @prefix schema: <http://schema.org/> .
  @prefix ql: <http://semweb.mmlab.be/ns/ql#> .
  @base <http://sti2.at/> . #the base for the classes
  
  
  <#LOGICALSOURCE>
  rml:source "./tests/straightMapping/input.json";
  rml:referenceFormulation ql:JSONPath;
  rml:iterator "$".
  
  
  <#Mapping>
  rml:logicalSource <#LOGICALSOURCE>;
  
   rr:subjectMap [
      rr:termType rr:BlankNode;
      rr:class schema:Person;
   ];
  
  
  rr:predicateObjectMap [
      rr:predicate schema:name;
      rr:objectMap [ rml:reference "name" ];
  ];
  
  rr:predicateObjectMap [
      rr:predicate schema:age;
      rr:objectMap [ rml:reference "age" ];
  ].

```

###Output
```json
{
  "@type": "http://schema.org/Person",
  "http://schema.org/name": "Tom A.",
  "http://schema.org/age": 15
}
```




