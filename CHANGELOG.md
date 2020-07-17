# Change Log

All notable changes to this project will be documented in this file.

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