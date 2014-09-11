////////////////////////////////////////////////////////////////////////////////
/// @brief tests for query language, in
///
/// @file
///
/// DISCLAIMER
///
/// Copyright 2010-2012 triagens GmbH, Cologne, Germany
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
/// Copyright holder is triAGENS GmbH, Cologne, Germany
///
/// @author Jan Steemann
/// @author Copyright 2012, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

var jsunity = require("jsunity");
var internal = require("internal");
var helper = require("org/arangodb/aql-helper");
var getQueryResults = helper.getQueryResults2;
var assertQueryError = helper.assertQueryError2;
var errors = internal.errors;

////////////////////////////////////////////////////////////////////////////////
/// @brief test suite
////////////////////////////////////////////////////////////////////////////////

function ahuacatlQueryOptimiserInTestSuite () {
  var c = null;
  var cn = "UnitTestsAhuacatlOptimiserIn";
  
  var explain = function (query, params) {
    return helper.getCompactPlan(AQL_EXPLAIN(query, params, { optimizer: { rules: [ "-all", "+use-index-range" ] } })).map(function(node) { return node.type; });
  };

  return {

////////////////////////////////////////////////////////////////////////////////
/// @brief set up
////////////////////////////////////////////////////////////////////////////////

    setUp : function () {
      internal.db._drop(cn);
      c = internal.db._create(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief tear down
////////////////////////////////////////////////////////////////////////////////

    tearDown : function () {
      internal.db._drop(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInMergeOr : function () {
      c.save({ _key: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ _key: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }

      var expected = [ 'test1', 'test2', 'test5', 'test7' ];
      var actual = getQueryResults("LET parents = [ 'test5', 'test7' ] FOR c IN " + cn + " FILTER c._key IN parents || c._key IN [ 'test1' ] || c._key IN [ 'test2' ] || c._key IN parents SORT c._key RETURN c._key");
      assertEqual(expected, actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInMergeAnd : function () {
      c.save({ _key: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ _key: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }

      var expected = [ 'test5', 'test7' ];
      var actual = getQueryResults("LET parents = [ 'test5', 'test7' ] FOR c IN " + cn + " FILTER c._key IN parents && c._key IN [ 'test5', 'test7' ] && c._key IN [ 'test7', 'test5' ] && c._key IN parents SORT c._key RETURN c._key");
      assertEqual(expected, actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInPrimaryConst : function () {
      c.save({ _key: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ _key: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }

      var expected = [ 'test5', 'test7' ];
      var query = "LET parents = [ 'test5', 'test7' ] FOR c IN " + cn + " FILTER c._key IN parents SORT c._key RETURN c._key";
      var actual = getQueryResults(query);
      assertEqual(expected, actual);

      assertEqual([ "SingletonNode", "CalculationNode", "EnumerateCollectionNode", "CalculationNode", "FilterNode", "CalculationNode", "SortNode", "CalculationNode", "ReturnNode" ], explain(query));
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInPrimaryDynamic : function () {
      c.save({ _key: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ _key: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }

      var expected = [ 'test5', 'test7' ];
      var query = "LET parents = (FOR c IN " + cn + " FILTER c._key IN [ 'test5', 'test7' ] RETURN c._key) FOR c IN " + cn + " FILTER c._key IN parents SORT c._key RETURN c._key";
      var actual = getQueryResults(query);
      assertEqual(expected, actual);

      assertEqual([ "SingletonNode", "SubqueryNode", "CalculationNode", "EnumerateCollectionNode", "CalculationNode", "FilterNode", "CalculationNode", "SortNode", "CalculationNode", "ReturnNode" ], explain(query));
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInPrimaryDynamicRef : function () {
      c.save({ _key: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ _key: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }

      var expected = [ { keys: [ 'test4' ] }, { keys: [ 'test6' ] } ];
      var actual = getQueryResults("FOR c IN " + cn + " FILTER c._key IN [ 'test5', 'test7' ] SORT c._key RETURN { keys: (FOR c2 IN " + cn + " FILTER c2._key IN [ c.parent ] RETURN c2._key) }");
      assertEqual(expected, actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInPrimaryRef : function () {
      c.save({ _key: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ _key: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }

      var expected = [ { keys: [ 'test4' ] }, { keys: [ 'test6' ] } ];
      var actual = getQueryResults("FOR c IN " + cn + " FILTER c._key IN [ 'test5', 'test7' ] SORT c._key RETURN { keys: (FOR c2 IN " + cn + " FILTER c2._key IN c.parents SORT c2._key RETURN c2._key) }");
      assertEqual(expected, actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInHashConst : function () {
      c.save({ code: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ code: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }
      c.ensureUniqueConstraint("code");

      var expected = [ 'test5', 'test7' ];
      var query = "LET parents = [ 'test5', 'test7' ] FOR c IN " + cn + " FILTER c.code IN parents SORT c.code RETURN c.code";
      var actual = getQueryResults(query);
      assertEqual(expected, actual);
      
      assertEqual([ "SingletonNode", "CalculationNode", "EnumerateCollectionNode", "CalculationNode", "FilterNode", "CalculationNode", "SortNode", "CalculationNode", "ReturnNode" ], explain(query));
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInHashDynamic : function () {
      c.save({ code: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ code: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }
      c.ensureUniqueConstraint("code");

      var expected = [ 'test5', 'test7' ];
      var query = "LET parents = (FOR c IN " + cn + " FILTER c.code IN [ 'test5', 'test7' ] RETURN c.code) FOR c IN " + cn + " FILTER c.code IN parents SORT c.code RETURN c.code";
      var actual = getQueryResults(query);
      assertEqual(expected, actual);
      
      assertEqual([ "SingletonNode", "SubqueryNode", "CalculationNode", "EnumerateCollectionNode", "CalculationNode", "FilterNode", "CalculationNode", "SortNode", "CalculationNode", "ReturnNode" ], explain(query));
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInHashDynamicRef : function () {
      c.save({ code: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ code: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }
      c.ensureUniqueConstraint("code");

      var expected = [ { keys: [ 'test4' ] }, { keys: [ 'test6' ] } ];
      var actual = getQueryResults("FOR c IN " + cn + " FILTER c.code IN [ 'test5', 'test7' ] SORT c.code RETURN { keys: (FOR c2 IN " + cn + " FILTER c2.code IN [ c.parent ] RETURN c2.code) }");
      assertEqual(expected, actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInHashRef : function () {
      c.save({ code: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ code: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }
      c.ensureUniqueConstraint("code");

      var expected = [ { keys: [ 'test4' ] }, { keys: [ 'test6' ] } ];
      var actual = getQueryResults("FOR c IN " + cn + " FILTER c.code IN [ 'test5', 'test7' ] SORT c.code RETURN { keys: (FOR c2 IN " + cn + " FILTER c2.code IN c.parents SORT c2.code RETURN c2.code) }");
      assertEqual(expected, actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInSkipConst : function () {
      c.save({ code: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ code: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }
      c.ensureUniqueSkiplist("code");

      var expected = [ 'test5', 'test7' ];
      var query = "LET parents = [ 'test5', 'test7' ] FOR c IN " + cn + " FILTER c.code IN parents SORT c.code RETURN c.code";
      var actual = getQueryResults(query);
      assertEqual(expected, actual);
      
      assertEqual([ "SingletonNode", "CalculationNode", "EnumerateCollectionNode", "CalculationNode", "FilterNode", "CalculationNode", "SortNode", "CalculationNode", "ReturnNode" ], explain(query));
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInSkipDynamic : function () {
      c.save({ code: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ code: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }
      c.ensureUniqueSkiplist("code");

      var expected = [ 'test5', 'test7' ];
      var query = "LET parents = (FOR c IN " + cn + " FILTER c.code IN [ 'test5', 'test7' ] RETURN c.code) FOR c IN " + cn + " FILTER c.code IN parents SORT c.code RETURN c.code";
      var actual = getQueryResults(query);
      assertEqual(expected, actual);
      
      assertEqual([ "SingletonNode", "SubqueryNode", "CalculationNode", "EnumerateCollectionNode", "CalculationNode", "FilterNode", "CalculationNode", "SortNode", "CalculationNode", "ReturnNode" ], explain(query));
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInSkipDynamicRef : function () {
      c.save({ code: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ code: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }
      c.ensureUniqueSkiplist("code");

      var expected = [ { keys: [ 'test4' ] }, { keys: [ 'test6' ] } ];
      var actual = getQueryResults("FOR c IN " + cn + " FILTER c.code IN [ 'test5', 'test7' ] SORT c.code RETURN { keys: (FOR c2 IN " + cn + " FILTER c2.code IN [ c.parent ] RETURN c2.code) }");
      assertEqual(expected, actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInSkipRef : function () {
      c.save({ code: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ code: "test" + i, parent: "test" + (i - 1), parents: [ "test" + (i - 1) ] });
      }
      c.ensureUniqueSkiplist("code");

      var expected = [ { keys: [ 'test4' ] }, { keys: [ 'test6' ] } ];
      var actual = getQueryResults("FOR c IN " + cn + " FILTER c.code IN [ 'test5', 'test7' ] SORT c.code RETURN { keys: (FOR c2 IN " + cn + " FILTER c2.code IN c.parents SORT c2.code RETURN c2.code) }");
      assertEqual(expected, actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInEdgeConst : function () {
      c.save({ _key: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ _key: "test" + i });
      }
      
      var en = cn + "Edge";
      internal.db._drop(en);
      var e = internal.db._createEdgeCollection(en);
      
      for (var i = 1; i < 100; ++i) {
        e.save(cn + "/test" + i, cn + "/test" + (i - 1), { });
      }

      var expected = [ cn + '/test4', cn + '/test6' ];
      var query = "LET parents = [ '" + cn + "/test5', '" + cn + "/test7' ] FOR c IN " + en + " FILTER c._from IN parents SORT c._to RETURN c._to";
      var actual = getQueryResults(query);
      assertEqual(expected, actual);
      
      assertEqual([ "SingletonNode", "CalculationNode", "EnumerateCollectionNode", "CalculationNode", "FilterNode", "CalculationNode", "SortNode", "CalculationNode", "ReturnNode" ], explain(query));
      
      internal.db._drop(en);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInEdgeDynamic : function () {
      c.save({ _key: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ _key: "test" + i });
      }
      
      var en = cn + "Edge";
      internal.db._drop(en);
      var e = internal.db._createEdgeCollection(en);
      
      for (var i = 1; i < 100; ++i) {
        e.save(cn + "/test" + i, cn + "/test" + (i - 1), { });
      }

      var expected = [ cn + '/test4', cn + '/test6' ];
      var query = "LET parents = (FOR c IN " + cn + " FILTER c._key IN [ 'test5', 'test7' ] RETURN c._id) FOR c IN " + en + " FILTER c._from IN parents SORT c._to RETURN c._to";
      var actual = getQueryResults(query);
      assertEqual(expected, actual);
      
      assertEqual([ "SingletonNode", "SubqueryNode", "CalculationNode", "EnumerateCollectionNode", "CalculationNode", "FilterNode", "CalculationNode", "SortNode", "CalculationNode", "ReturnNode" ], explain(query));
      
      internal.db._drop(en);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInEdgeDynamicRef : function () {
      c.save({ _key: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ _key: "test" + i });
      }
      
      var en = cn + "Edge";
      internal.db._drop(en);
      var e = internal.db._createEdgeCollection(en);
      
      for (var i = 1; i < 100; ++i) {
        e.save(cn + "/test" + i, cn + "/test" + (i - 1), { });
      }

      var expected = [ { keys: [ cn + '/test4' ] }, { keys: [ cn + '/test6' ] } ];
      var actual = getQueryResults("FOR c IN " + cn + " FILTER c._key IN [ 'test5', 'test7' ] SORT c._key RETURN { keys: (FOR c2 IN " + en + " FILTER c2._from IN [ c._id ] RETURN c2._to) }");
      assertEqual(expected, actual);
      
      internal.db._drop(en);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testInEdgeRef : function () {
      c.save({ _key: "test0" });
      for (var i = 1; i < 100; ++i) {
        c.save({ _key: "test" + i, ids: [ cn + "/test" + i ] });
      }
      
      var en = cn + "Edge";
      internal.db._drop(en);
      var e = internal.db._createEdgeCollection(en);
      
      for (var i = 1; i < 100; ++i) {
        e.save(cn + "/test" + i, cn + "/test" + (i - 1), { });
      }

      var expected = [ { keys: [ cn + '/test4' ] }, { keys: [ cn + '/test6' ] } ];
      var actual = getQueryResults("FOR c IN " + cn + " FILTER c._key IN [ 'test5', 'test7' ] SORT c._key RETURN { keys: (FOR c2 IN " + en + " FILTER c2._from IN c.ids RETURN c2._to) }");
      assertEqual(expected, actual);
      
      internal.db._drop(en);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check a ref access without any indexes
////////////////////////////////////////////////////////////////////////////////

    testBitarray : function () {
      var colors = [ "black", "blue", "green", "red" ]; 
      var expected =  [];

      for (var i = 0; i < 100; ++i) { 
        c.save({ value: colors[i % 4] }); 
        expected.push(colors[Math.floor(i / 25)]);
      } 
      c.ensureBitarray("value", colors);
      
      var actual = getQueryResults("LET colors = UNIQUE((FOR x IN @@cn RETURN x.value)) FOR x IN @@cn FILTER x.value IN colors SORT x.value RETURN x.value", { "@cn" : cn });
      assertEqual(expected, actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check invalid values for IN
////////////////////////////////////////////////////////////////////////////////

    testInvalidIn : function () {
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN [ 1, 2, 3 ] FILTER 1 IN null RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN [ 1, 2, 3 ] FILTER 1 IN false RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN [ 1, 2, 3 ] FILTER 1 IN 1.2 RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN [ 1, 2, 3 ] FILTER 1 IN '' RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN [ 1, 2, 3 ] FILTER 1 IN {} RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN [ 1, 2, 3 ] FILTER 1 IN @values RETURN i", { values: null });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN [ 1, 2, 3 ] FILTER 1 IN @values RETURN i", { values: false });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN [ 1, 2, 3 ] FILTER 1 IN @values RETURN i", { values: 1.2 });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN [ 1, 2, 3 ] FILTER 1 IN @values RETURN i", { values: "" });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN [ 1, 2, 3 ] FILTER 1 IN @values RETURN i", { values: { } });
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check invalid values for IN
////////////////////////////////////////////////////////////////////////////////

    testInvalidInCollection : function () {
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER 1 IN null RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER 1 IN false RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER 1 IN 1.2 RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER 1 IN '' RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER 1 IN {} RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER 1 IN @values RETURN i", { values: null });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER 1 IN @values RETURN i", { values: false });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER 1 IN @values RETURN i", { values: 1.2 });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER 1 IN @values RETURN i", { values: "" });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER 1 IN @values RETURN i", { values: { } });
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check invalid values for IN
////////////////////////////////////////////////////////////////////////////////

    testInvalidInCollectionIndex : function () {
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER i._id IN null RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER i._id IN false RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER i._id IN 1.2 RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER i._id IN '' RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER i._id IN {} RETURN i");
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER i._id IN @values RETURN i", { values: null });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER i._id IN @values RETURN i", { values: false });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER i._id IN @values RETURN i", { values: 1.2 });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER i._id IN @values RETURN i", { values: "" });
      assertQueryError(errors.ERROR_QUERY_LIST_EXPECTED.code, "FOR i IN " + cn + " FILTER i._id IN @values RETURN i", { values: { } });
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief check valid IN queries
////////////////////////////////////////////////////////////////////////////////

    testValidIn : function () {
      c.save({ value: "red" });
      c.save({ value: "green" });
      c.save({ value: "blue" });
      c.save({ value: 12 });
      c.save({ value: false });
      c.save({ value: null });
      
      var actual = getQueryResults("FOR i IN " + cn + " FILTER i.value IN [ 'red', 'green' ] SORT i.value RETURN i.value");
      assertEqual([ "green", "red" ], actual);
      
      actual = getQueryResults("FOR i IN " + cn + " FILTER i.value IN [ 'green', 'blue' ] SORT i.value RETURN i.value");
      assertEqual([ "blue", "green" ], actual);
      
      actual = getQueryResults("FOR i IN " + cn + " FILTER i.value IN [ 'foo', 'bar' ] SORT i.value RETURN i.value");
      assertEqual([ ], actual);
      
      actual = getQueryResults("FOR i IN " + cn + " FILTER i.value IN [ 12, false ] SORT i.value RETURN i.value");
      assertEqual([ false, 12 ], actual);
      
      actual = getQueryResults("FOR i IN " + cn + " FILTER i.value IN [ 23, 'black', 'red', null ] SORT i.value RETURN i.value");
      assertEqual([ null, 'red' ], actual);
      
      c.truncate();
      c.save({ value: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, "red", "blue" ]});
      actual = getQueryResults("FOR i IN " + cn + " FILTER 12 IN i.value SORT i.value RETURN LENGTH(i.value)");
      assertEqual([ 14 ], actual);
      
      actual = getQueryResults("FOR i IN " + cn + " FILTER 13 IN i.value SORT i.value RETURN LENGTH(i.value)");
      assertEqual([ ], actual);
      
      actual = getQueryResults("FOR i IN " + cn + " FILTER 'red' IN i.value SORT i.value RETURN LENGTH(i.value)");
      assertEqual([ 14 ], actual);
    },

  };

}

////////////////////////////////////////////////////////////////////////////////
/// @brief executes the test suite
////////////////////////////////////////////////////////////////////////////////

jsunity.run(ahuacatlQueryOptimiserInTestSuite);

return jsunity.done();

// Local Variables:
// mode: outline-minor
// outline-regexp: "^\\(/// @brief\\|/// @addtogroup\\|// --SECTION--\\|/// @page\\|/// @}\\)"
// End:
