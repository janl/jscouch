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
$(function() {
  // Pretty much the same code in couch_view.erl, except this is JavaScript
  // instead of Erlang.
  

  var couch = $.jscouch.couchdb;
  var collator = $.jscouch.collator;

  // syntax highlighter (works with JSON.stringify)
  var highlighter = function(key, value) {
    if (typeof(value) === 'string') {
      value = value.replace(/&/g, '&amp;')
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
      return '<span class=jstring>' + value + '</span>';
    }

    if (typeof(value) === 'number') {
      return '<span class=jnumber>' + value + '</span>';
    }

    if (value === null) {
      return '<span class=jkeyword>null</span>';
    }

    return value;
  };

  // convert a JSON object into HTML with embedded spans
  var htmlify = function(obj, indent) {
    var html = JSON.stringify(obj, highlighter, indent);
    var rekword = new RegExp('"(<span class=jkeyword>null</span>)"', 'g');
    var renumbr = new RegExp('"(<span class=jnumber>[^<]+</span>)"', 'g');
    return html.replace(rekword, '$1').replace(renumbr, '$1');
  };

  // setup the tabs
  var fieldset = $('fieldset#tabs');
  var legend   = fieldset.find('legend');
  var pane     = fieldset.find('div#pane');
  var links    = legend.find('a');
  links.click(function() {
    links.removeClass('active');
    $(this).addClass('active');
    pane.children().css('display', 'none').end()
      .find('div#' + $(this).attr('id')).css('display', '');
  }).eq(0).click();

  // add a new document
  $('a#add').click(function() {
    $(this).nextAll('div#doc')
      .find('span.warn').empty().end()
      .slideToggle();
  });

  // add a document to the doc table
  var doctbody = $('table#docs tbody').empty();
  var addDocToTable = function(doc) {
    var _id, _rev, _doc = {};
    $.each(doc, function(key, val) {
      key === '_id' ? _id = val : key === '_rev' ? _rev = val : _doc[key] = val;
    });

    $(doctbody).append(
      '<tr>' +
      '<td>' + _id + '</td>' +
      '<td>' + htmlify(_doc) + '</td>' +
      '</tr>'
    );
  };

  $('div#doc input').click(function() {
    var text = $(this).parent().prevAll('textarea').val();
    try {
      var doc = JSON.parse(text);
      couch.put(doc);
      $('div#doc').slideToggle();
      addDocToTable(doc);
    } catch(e) {
      $('div#doc span.warn').text("need a proper json object");
    }
  });

  var mapdiv = pane.find('div#map');
  var maptxt = mapdiv.find('textarea#map');
  var redtxt = mapdiv.find('textarea#reduce');
  var aexec  = mapdiv.find('a#execute');
  var bottom = mapdiv.find('table#bottom');
  var rstbl = mapdiv.find('table#results').empty();
  var rsdiv = mapdiv.find('div#response').empty();

  var vwslct = mapdiv.find('select#view');

  // display the results based on the view parameters
  var filterAndView = function() {
    var result = couch.groups || couch.maprs;
    if (!result) {
      return;
    }
    
    var rstxt = ['{<br/>'];
    if (couch.groups === null) {
      rstxt.push('&nbsp;&nbsp;&nbsp;&nbsp;');
      rstxt.push('"total_rows": ' + couch.maprs.length + ',<br/>');
    }

    var query = vwslct.val();
    if (query === 'key') {
      try {
        var key = mapdiv.find('input#key').val();
        key = key.length === 0 ? null : JSON.parse(key);
        if (key) {
          result = $.map(result, function(row) {
            return collator.sorter(row.key, key) === 0 ? row : null;
          });
        }
      } catch(e) {
        result = [];
      }
    } else if (query === 'range') {
      var startkey = null;
      try {
        var startkey = mapdiv.find('input#startkey').val();
        startkey = startkey.length === 0 ? null : JSON.parse(startkey);
        var endkey = mapdiv.find('input#endkey').val();
        endkey = endkey.length === 0 ? null : JSON.parse(endkey);

        result = $.map(result, function(row) {
          var start = startkey ? collator.sorter(row.key, startkey) >= 0 : true;
          var end = endkey ? collator.sorter(row.key, endkey) <= 0 : true;
          return (start && end) ? row : null;
        });
      } catch(e) {
        result = [];
      }
    }

    rstxt.push('&nbsp;&nbsp;&nbsp;&nbsp;');
    rstxt.push('"rows": [<br/>');
    $.each(result, function(i, e) {
      rstxt.push('&nbsp;&nbsp;&nbsp;&nbsp;');
      rstxt.push('&nbsp;&nbsp;&nbsp;&nbsp;');
      rstxt.push(htmlify(e));
      rstxt.push(i < result.length - 1 ? ',<br/>' : '<br/>');
    });
    rstxt.push('&nbsp;&nbsp;&nbsp;&nbsp;');
    rstxt.push('    ]<br/>');
    rstxt.push('}<br/>');

    rsdiv.html(rstxt.join(''));
  };

  // recompute the results if the query parameters change
  vwslct.change(function() {
    var val = $(this).val();
    var views = $(this).next('span#views');
    views.children().css('display', 'none').end()
      .find('span#' + val).css('display', '');
    filterAndView();
  });

  // recompute the view result when the query parameters change
  pane.find('input#key,input#startkey,input#endkey').keyup(function() {
    var val = $(this).val();
    try {
      if (val.length !== 0) {
        JSON.parse($(this).val());
      }
      filterAndView();
      $(this).css('color', 'black');
    } catch(e) {
      $(this).css('color', 'red');
    }
  });

  // do the map/reduce bit
  aexec.click(function() {
    var warn = mapdiv.find('span.warn').text('');
    rstbl.empty();
    bottom.hide();

    // reset the results from the last query
    couch.maprs = null;
    couch.groups = null;
    vwslct.attr('selectedIndex', 0).triggerHandler('change');

    // map the documents
    var maprs = null;
    try {
      maprs = couch.map(maptxt.val());
    } catch(e) {
      warn.text('map: ' + e.toString());
      return;
    }

    // reduce the values (if there is a reduce function)
    var groups = null;
    if (redtxt.val().replace(/\s+/g, '').length > 0) {
      try {
        groups = couch.reduce(maprs, redtxt.val());
      } catch(e) {
        warn.text('reduce: ' + e.toString());
        return;
      }
    }

    couch.maprs  = maprs;
    couch.groups = groups;

    // and then render the results
    var tblhead = [];
    tblhead.push('<thead><tr><td>id</td><td>key</td><td>value</td>');
    if (groups) {
      tblhead.push('<td>&raquo;&nbsp;reduced</td>');
    }
    tblhead.push('</tr></thead>');

    var tblbody = [];
    tblbody.push('<tbody>');
    var gindex = 0;
    $.each(maprs, function(index, obj) {
      tblbody.push('<tr>');
      tblbody.push('<td>' + obj.id + '</td>');
      tblbody.push('<td>' + htmlify(obj.key) + '</td>');
      tblbody.push('<td>' + htmlify(obj.value) + '</td>');

      if (groups && gindex < groups.length) {
        var first = groups[gindex];
        if (collator.sorter(obj.key, first.key) === 0) {
          gindex++;
          tblbody.push(
            '<td class="reduced" rowspan="' + first.count + '">' +
            '&raquo;&nbsp;' + htmlify(first.value) + 
            '</td>'
          );

          delete first.count;
        }
      }

      tblbody.push('</tr>');
    });
    tblbody.push('</tbody>');

    rstbl.append(tblhead.join('')).append(tblbody.join(''));
    if (groups) {
      rstbl.find('td.reduced')
        .prevAll('td').css('border-top', '2px dotted gray').end()
      .end()
      .find('tbody tr:last td:not(.reduced)')
        .css('border-bottom', '2px dotted gray')
      .end();
    }

    filterAndView();
    bottom.show();
  });

  var examples = [
    {
      name: "sorting pictures by user",
      blurb: "In this simple example, we want to sort all the " +
        "pictures by the user so we can present that in a UI of some " +
        "sort. So for this we use just the map function which " +
        "<strong>emit</strong>s one key for each document.",
      action: function() {
        maptxt.val('emit(doc.user, null)');
        redtxt.val('');
      }
    },
    {
      name: "sorting pictures by date",
      blurb: "In this simple example, we want to sort all the " +
        "pictures by date so we can present that in a UI of some " +
        "sort. So we use just the map function which " +
        "<strong>emit</strong>s one key/value pair for each of the " +
        "document.",
      action: function() {
        maptxt.val('emit(Date.parse(doc.created_at), null)');
        redtxt.val('');
      }
    },
    {
      name: 'total size of all images',
      blurb: "All we want is to add up the <em>doc.info.size</em> " +
        "fields across all documents. So we now use the " +
        "<strong>reduce</strong> function to do this aggregation. " + 
        "CouchDB provides a <strong>sum</strong> function, but " +
        "we could add others too.",
      action: function() {
        maptxt.val('emit("size", doc.info.size);');
        redtxt.val('return sum(values);');
      }
    },
    {
      name: "counting pictures by users",
      blurb: "Unlike the last example, we are now going to " +
        "<strong>emit</strong> the name of the user as well as a " +
        "value of 1. Then we are going to reduce the values for " +
        "each user to sum of all the values. CouchDB provides a " +
        "<strong>sum</strong> function, but we could add others " +
        "too.",
      action: function() {
        maptxt.val('emit(doc.user, 1);');
        redtxt.val('return sum(values);');
      }
    },
    {
      name: 'counting pictures by hour',
      blurb: "The key used in <strong>emit</strong> doesn't have to " +
        "be something in the document. New keys and new values can " +
        "be derived. Notice how we are taking the create_at date and " +
        "converting it into hours (since 1971). During the query, " +
        "this allows us to extract data for specific time slices.",
      action: function() {
        maptxt.val('emit(Math.floor(Date.parse(doc.created_at)/1000/60/60), 1);');
        redtxt.val('return sum(values);');
      }
    },
    {
      name: 'computing min width/height',
      blurb: 'Another important concept is that the map function can ' +
        '<strong>emit</strong> more than one key/value pair for ' +
        'a given document. But since the keys are grouped together, ' +
        'you can reduce them independently.',
      action: function() {
        maptxt.val(
          'emit("width", doc.info.width);\r\n' +
          'emit("height", doc.info.height);'
        );
        redtxt.val(
          'var rv=null;\r\n' +
          'for (i=0; i<values.length; ++i) {\r\n' +
          '    rv = Math.min(values[i], rv || values[i]);\r\n' +
          '}\r\n' +
          'return rv;'
        );
      }
    },
    {
      name: 'computing min AND max width/height',
      blurb: 'In the last example, we reduced the min of width and ' +
        'height. What if we wanted to compute both the min and the ' +
        'max in one go? The answer is by using <em>complex</em> ' +
        'values. Notice that the reduce function returns a value ' +
        "that looks very similar to what the map emits.",
      action: function() {
        maptxt.val(
          'emit("width", { min: doc.info.width, max: doc.info.width });\r\n' +
          'emit("height", { min: doc.info.height, max: doc.info.height });'
        );
        redtxt.val(
          'var rv = { min: null, max: null };\r\n' +
          'for (i=0; i<values.length; ++i) {\r\n' +
          '    var value = values[i];\r\n' +
          '    rv.min = Math.min(value.min, rv.min || value.min);\r\n' +
          '    rv.max = Math.max(value.max, rv.max || value.max);\r\n' +
          '}\r\n' +
          'return rv;'
        );
      }
    },
    {
      name: 'unique cameras for a user (attempt #1)',
      blurb: 'We want to find out what kind of cameras a given user ' +
        "has used when uploading pictures. This one uses " +
        "<strong>reduce</strong> to find that out. But be aware that " +
        "this could make CouchDB pretty slow especially if the " +
        "#cameras per user is not bounded.",
      action: function() {
        maptxt.val(
          'var val = {};\r\n' +
          'val[doc.camera] = 1;\r\n' +
          'emit(doc.user, val);'
        );
        redtxt.val(
          'var rv = {};\r\n' +
          'for (i in values) {\r\n' +
          '    var value = values[i];\r\n' +
          '    for (k in value) {\r\n' +
          '        rv[k] = (rv[k] || 0) + value[k];\r\n' +
          '    }\r\n' +
          '}\r\n' +
          'return rv;'
        );
      }
    },
    {
      name: 'unique cameras for a user (attempt #2)',
      blurb: "In this approach, we use [user, camera] as the unique " +
        "key and reduce that to get our answers. This approach tends " +
        "to scale better as the number of unique values grows. The " +
        "downside is that the client has to setup the query properly " +
        "using <strong>startkey</strong>/<strong>endkey</strong> " +
        "to get at the unique values.",
      action: function() {
        maptxt.val('emit([doc.user, doc.camera], 1);');
        redtxt.val('return sum(values);');
      }
    },
    {
      name: "counting pictures by users (advanced)",
      blurb: "This example demonstrates the <strong>rereduce</strong> " +
        "option in the reduce function. CouchDB doesn't necessarily " +
        "pass in all the values for a <em>unique</em> key to the " +
        "<strong>reduce</strong> function. This means that the " +
        "reduce function needs to handle values potentially being " +
        "an array of previous outputs. Since " +
        "this is an emulator that runs within the browser, we've " +
        "mapped the <strong>log</strong> method that CouchDB " +
        "provides into <em>window.alert</em>, so you can see " +
        "how map/reduce works. You need to " +
        "explicitly click on the <strong><em>execute</em></strong> " +
        "link below, which will trigger 5 alerts.",
      action: function() {
        mapdiv.find('span.warn').text('');
        rstbl.empty();
        rsdiv.empty();
        bottom.hide();
        maptxt.val('emit(doc.user, 1);');
        redtxt.val(
          'log([ keys, values, rereduce ]);\r\n' +
          'return sum(values);'
        );
        return false;
      }
    }
  ];

  // load the examples
  var exslct = mapdiv.find('select#examples');
  var blrdiv = mapdiv.find('div#blurb');
  $.each(examples, function(index, e) {
    exslct.append('<option>' + e.name + '</option>');
  });

  // and run them when clicked on
  exslct.change(function() {
    blrdiv.slideUp(function() {
      var index = exslct.attr('selectedIndex');
      if (index > 0) {
        blrdiv.html(examples[index-1].blurb);
        var rv = examples[index-1].action();
        blrdiv.slideDown(function() {
          if (rv !== false) {
            aexec.click();
          }
        });
      }
    });
  });

  // feedback while entering a new JSON doc
  pane.find('textarea#doc').keyup(function() {
    try {
      JSON.parse($(this).val());
      $(this).css('color', 'black');
    } catch(e) {
      $(this).css('color', 'red');
    }
  });

  $.jscouch.documents.load();

  // populate the initial docs to the UI
  couch.each(function(index, doc) { addDocToTable(doc); });
});
})(jQuery);
