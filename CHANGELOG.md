# Change Log

All notable changes to this project will be documented in this file.

## [2.1.1] - 2022.12.15

- dependency updates

## [2.1.0] - 2022.09.29

- maybe BREAKING: use different csv parser `csvjson`-> `csv-parse`, 

## [2.0.1] - 2022.09.23

- csv.quote option

## [2.0.0] - 2022.07.27

- update all dependencies to latest
- fix rml:reference with rr:termType rr:IRI
- breaking: remove in-mapping JS functions & http calls (`jsFunction`, `httpCall`), use normal functions instead
- breaking: auto join mappings with same logical-source: no cross product anymore for referencing mapping that have same logical-source without a join condition. if cross product is desired use different logical-sources

## [1.14.2] - 2022.07.27

- Support for non array predicateObjectMaps PR #37
- Support for rr:subject #36

## [1.14.1] - 2022.07.07

- add support for spliting jsonpath array results into multiple triples: https://github.com/semantifyit/RocketRML/issues/32

## [1.14.0] - 2022.07.06

- add support for nested functions: https://github.com/semantifyit/RocketRML/issues/30 & https://github.com/semantifyit/RocketRML/pull/31

## [1.13.0] - 2022.05.02

- add option `csv.delimiter`
- add option `ignoreValues` to ignore values from the input (e.g. `ignoreValues: ["-"]`)

## [1.12.1] - 2022.04.28

- update dependencies

## [1.12.0] - 2021.11.30

- may contain breaking changes:
- update packages to latest: jsonpath-plus (breaking), xmldom (@xmldom/xmldom), jsonld (breaking), ...
- fix bug with jsonpath `[]` selectors

## [1.11.3] - 2021.09.03

- fix jsonpath for null values

## [1.11.2] - 2021.08.30

- fix ts declarations file

## [1.11.1] - 2021.08.17

- support for templates as function parameters: https://github.com/semantifyit/RocketRML/pull/24

## [1.11.0] - 2021.08.11

- add support for accessing function parameters via their predicate: https://github.com/semantifyit/RocketRML/pull/23

## [1.10.2] - 2021.07.19

- fix ignoreEmptyStrings for CSV

## [1.10.1] - 2021.05.25

- fix ignoreEmptyStrings not being used everywhere

## [1.10.0] - 2021.05.21

- support rml:LanguageMap
- add option to disable mapping of empty strings (ignoreEmptyStrings)

## [1.9.4] - 2021.04.16

- update package-lock.json

## [1.9.3] - 2021.03.16

- change typings

## [1.9.2] - 2021.03.15

- add Typescript typings

## [1.9.1] - 2021.03.15

- remove sync-request, add axios

## [1.9.0] - 2021.03.15

- update dependencies, remove safe-eval

## [1.8.2] - 2020.09.06

- fixed rdf:type constant IRIs

## [1.8.1] - 2020.09.06

- fixed constant IRIs

## [1.8.0] - 2020.07.17

- support function as range of subjectMap

## [1.7.3] - 2020.07.17

- removed console.log

## [1.7.2] - 2020.07.16

- Fixed xpath-iterator opt dependency usage

## [1.7.1] - 2020.06.30

- Fixed dependency (https://github.com/ThibaultGerrier/XpathIterator/pull/2)

## [1.7.0] - 2020.04.29

- Add support for async functions

## [1.6.1] - 2020.04.29

- Fix templates that don't contain any templates, e.g. `rr:template "foo"`

## [1.6.0] - 2020.04.22

- Support multiple join conditions per single parentTriplesMap

## [1.5.0] - 2020.04.14

- Fixed constant shortcut properties (https://rml.io/specs/rml/#constant)

## [1.4.1] - 2020.04.06

- pugixml throws error if constructor fails (previously silently exited)

## [1.4.0] - 2020.04.06

- new xpath library: fontoxpath. Supports xpath 3.1. Use with {xpathLib: 'fontoxpath'}


## [1.3.0] - 2020.04.06

- new jsonld & n3 versions
- fixed jsonld compacting bug


## [1.2.0] - 2020.02.04

- important performance improvements

## [1.1.0] - 2020.02.04

- Add PATH~ option option to JSONpath/xpath/csv (not for xpath-cpp/performance mode) (check /tests/path(Json|Xml|Csv)Join/ for examples)
- performance improvements
