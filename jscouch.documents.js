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
  var now = new Date().getTime();
  var millisInHHour = 1000*60*30;

  $.jscouch = $.jscouch || {};
  $.jscouch.documents = $.jscouch.documents || {};
  $.extend($.jscouch.documents, {
    load: function() {
      // popluate the DB with initial entries
      $.jscouch.couchdb.put({ 
        name: 'fish.jpg', 
        created_at: new Date(now + millisInHHour*Math.random()).toUTCString(),
        user: 'bob',
        type: 'jpeg', 
        camera: 'nikon',
        info: {
          width: 100, 
          height: 200, 
          size: 12345
        },
        tags: [ 'tuna', 'shark' ]
      });
      $.jscouch.couchdb.put({ 
        name: 'trees.jpg', 
        created_at: new Date(now + millisInHHour*Math.random()).toUTCString(),
        user: 'john',
        type: 'jpeg', 
        camera: 'canon',
        info: {
          width: 30, 
          height: 250, 
          size: 32091
        },
        tags: [ 'oak' ]
      });
      $.jscouch.couchdb.put({ 
        name: 'snow.png', 
        created_at: new Date(now + millisInHHour*Math.random()).toUTCString(),
        user: 'john',
        type: 'png', 
        camera: 'canon',
        info: {
          width: 64, 
          height: 64, 
          size: 1253
        },
        tags: [ 'tahoe', 'powder' ]
      });
      $.jscouch.couchdb.put({ 
        name: 'hawaii.png', 
        created_at: new Date(now + millisInHHour*Math.random()).toUTCString(),
        user: 'john',
        type: 'png', 
        camera: 'nikon',
        info: {
          width: 128, 
          height: 64, 
          size: 92834
        },
        tags: [ 'maui', 'tuna' ]
      });
      $.jscouch.couchdb.put({ 
        name: 'hawaii.gif', 
        created_at: new Date(now + millisInHHour*Math.random()).toUTCString(),
        user: 'bob',
        type: 'gif', 
        camera: 'canon',
        info: {
          width: 320, 
          height: 128, 
          size: 49287
        },
        tags: [ 'maui' ]
      });
      $.jscouch.couchdb.put({ 
        name: 'island.gif', 
        created_at: new Date(now + millisInHHour*Math.random()).toUTCString(),
        user: 'zztop',
        type: 'gif', 
        camera: 'nikon',
        info: {
          width: 640, 
          height: 480, 
          size: 50398
        },
        tags: [ 'maui' ]
      });
    }
  });
})(jQuery);
