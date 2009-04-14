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

(function($) {
  $.jscouch = $.jscouch || {};
  $.jscouch.collator = $.jscouch.collator || {};
  $.extend($.jscouch.collator, {
    sorter: function(a, b) {
      var tA = $.jscouch.collator.type_sort(a);
      var tB = $.jscouch.collator.type_sort(b);
      if (tA !== tB) {
        return tA - tB;
      }
      return $.jscouch.collator.less_same_type[tA](a, b);
    },
    type_sort: function(k) {
      if (k === undefined || k === null || k === false || k === true) {
        return 0;
      }

      if (typeof(k) === 'number') {
        return 1;
      }

      if (typeof(k) === 'string') {
        return 2;
      }

      if (Object.prototype.toString.apply(k) === '[object Array]') {
        return 3;
      }

      return 4;
    },
    atom_sort: function(k) {
      if (k === undefined) {
        return 0;
      }

      if (k === null) {
        return 1;
      }

      if (k === false) {
        return 2;
      }

      return 3;
    },
    less_same_type: [
      function(atomA, atomB) {
        return $.jscouch.collator.atom_sort(atomA) - $.jscouch.collator.atom_sort(atomB);
      },
      function(numberA, numberB) {
        return numberA - numberB;
      },
      function(stringA, stringB) {
        return stringA < stringB ? -1 : stringA > stringB ? 1 : 0;
      },
      function(arrayA, arrayB) {
        for (var i=0; i<arrayA.length; ++i) {
          var eA = arrayA[i];
          var tA = $.jscouch.collator.type_sort(eA);
          var eB = arrayB[i];
          var tB = $.jscouch.collator.type_sort(eB);
          if (eB === undefined) {
            return 1;
          }

          if (tA === tB) {
            var val = $.jscouch.collator.less_same_type[tA](eA, eB);
            if (val !== 0) {
              return val;
            }
          } else {
            return tA - tB;
          }
        }

        return 0;
      },
      function(objA, objB) {
        var aryA = [];
        for (var i in objA) { aryA.push([i, objA[i]]); }
        var aryB = [];
        for (var j in objB) { aryB.push([j, objB[j]]); }
        return $.jscouch.collator.less_same_type[3](aryA, aryB);
      }
    ]
  });
})(jQuery);
