/*
  Licensed under the Apache License, Version 2.0 (the "License"); you may not
  use this file except in compliance with the License.  You may obtain a copy
  of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
  License for the specific language governing permissions and limitations under
  the License.

  Initial implementation:

  * http://www.mudynamics.com
  * http://labs.mudynamics.com
  * http://www.pcapr.net
*/

// The 'database' containing a list of JSON documents which also supports
// map/reduce but with hooks to visualize the results
(function($) {
  var nextid = 0;
  var docs = [];

  var mapkv = [];
  var emit = function(k, v) {
    var last = mapkv[mapkv.length-1];
    last.kv.push([k || null, v || null]);
  };

  var log = function(obj) {
    alert(JSON.stringify(obj));
  };

  $.jscouch = $.jscouch || {};
  $.jscouch.couchdb = $.jscouch.couchdb || {};
  $.extend($.jscouch.couchdb, {
    clear: function() {
      docs = [];
      nextid = 0;
      return $.jscouch.couchdb;
    },
    put: function(doc) {
      doc._id  = '' + (++nextid);
      doc._rev = '1';
      docs.push(doc);
      return $.jscouch.couchdb;
    },
    each: function(fn) {
      $.each(docs, fn);
      return $.jscouch.couchdb;
    },
    map: function(mapfnval) {
      mapkv = [];
      var mapfn = eval('foo=(function(doc) {' + mapfnval + '})');
      $.jscouch.couchdb.each(function(index, doc) {
        mapkv.push({ doc: doc, kv: [] });
        mapfn(doc);
      });

      var maprs = [];
      $.each(mapkv, function(i1, e1) {
        $.each(e1.kv, function(i2, e2) {
          maprs.push({ id: e1.doc._id, key: e2[0], value: e2[1] });
        });
      });

      maprs.sort(function(d1, d2) { 
        return $.jscouch.collator.sorter(d1.key, d2.key); 
      });
      return maprs;
    },
    reduce: function(maprs, redfnval) {
      var groups = [];
      var sum = function(values) {
        var rv = 0;
        for (var i in values) {
          rv += values[i];
        }
        return rv;
      };

      // First group the values by key (we use the collator to group
      // equivalent keys)
      $.each(maprs, function(i, e) {
        var last = groups[groups.length-1] || null;
        if (last && $.jscouch.collator.sorter(last.key[0][0], e.key) === 0) {
          last.key.push([e.key, e.id]);
          last.value.push(e.value);
          return;
        }

        groups.push({ key: [ [e.key,e.id] ], value: [ e.value ]});
      });

      // Then run each of the keys through the reduce function. If a
      // given group has more than 2 keys, then we invoke rereduce
      // just to illustrate how rereduce works
      var redfn = eval('foo=(function(keys, values, rereduce) {' + redfnval + '})');
      $.each(groups, function(i, e) {
        if (e.value.length > 2) {
          var k1 = e.key.slice(0, e.key.length/2);
          var v1 = e.value.slice(0, e.value.length/2);
          var rv1 = redfn(k1, v1) || null;

          var k2 = e.key.slice(e.key.length/2);
          var v2 = e.value.slice(e.value.length/2);
          var rv2 = redfn(k2, v2) || null;

          e.value = redfn(null, [ rv1, rv2 ], true);
        } else {
          e.value = redfn(e.key, e.value) || null;
        }

        e.count = e.key.length;
        e.key   = e.key[0][0];
      });

      return groups;
    }
  });
})(jQuery);
