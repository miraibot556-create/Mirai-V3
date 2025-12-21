"use strict";

/**
 * Friend API Module
 * Manage friend requests, friend list, and friend suggestions
 * 
 * @author Priyansh Rajput
 * @github https://github.com/priyanshufsdev
 * @license MIT
 */

var utils = require("../utils");
var log = require("npmlog");

/**
 * Format friends data from GraphQL response
 * @private
 */
function formatFriends(data, type) {
  var viewer = data?.data?.viewer;
  var edges;
  
  if (type === 'requests' && viewer?.friend_requests?.edges) {
    edges = viewer.friend_requests.edges;
  } else if (type === 'suggestions' && viewer?.people_you_may_know?.edges) {
    edges = viewer.people_you_may_know.edges;
  } else if (type === 'list' && data?.data?.node?.all_collections?.nodes[0]?.style_renderer?.collection?.pageItems?.edges) {
    edges = data.data.node.all_collections.nodes[0].style_renderer.collection.pageItems.edges;
  } else {
    return [];
  }
  
  return edges.map(function(edge) {
    var node = edge.node;
    return {
      userID: node.id || node.node?.id,
      name: node.name || node.title?.text,
      profilePicture: node.profile_picture?.uri || node.image?.uri,
      socialContext: node.social_context?.text || node.subtitle_text?.text,
      url: node.url
    };
  });
}

module.exports = function(defaultFuncs, api, ctx) {
  
  var friendModule = {
    /**
     * Get pending friend requests
     * @param {function} callback - Optional callback
     * @returns {Promise<Array>}
     */
    requests: function(callback) {
      var resolveFunc = function() {};
      var rejectFunc = function() {};
      var returnPromise = new Promise(function(resolve, reject) {
        resolveFunc = resolve;
        rejectFunc = reject;
      });

      if (!callback) {
        callback = function(err, data) {
          if (err) return rejectFunc(err);
          resolveFunc(data);
        };
      }

      var form = {
        av: ctx.userID,
        __user: ctx.userID,
        __a: "1",
        fb_dtsg: ctx.fb_dtsg,
        jazoest: ctx.jazoest,
        lsd: ctx.lsd,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "FriendingCometRootContentQuery",
        variables: JSON.stringify({ scale: 3 }),
        doc_id: "9103543533085580"
      };

      defaultFuncs
        .post("https://www.facebook.com/api/graphql/", ctx.jar, form, {})
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
        .then(function(res) {
          if (res.errors) throw new Error(JSON.stringify(res.errors));
          var formatted = formatFriends(res, 'requests');
          log.info('friend.requests', 'Found ' + formatted.length + ' friend requests');
          callback(null, formatted);
        })
        .catch(function(err) {
          log.error('friend.requests', err);
          callback(err);
        });

      return returnPromise;
    },

    /**
     * Accept a friend request
     * @param {string} identifier - User ID or name
     * @param {function} callback - Optional callback
     * @returns {Promise<object>}
     */
    accept: function(identifier, callback) {
      var resolveFunc = function() {};
      var rejectFunc = function() {};
      var returnPromise = new Promise(function(resolve, reject) {
        resolveFunc = resolve;
        rejectFunc = reject;
      });

      if (!callback) {
        callback = function(err, data) {
          if (err) return rejectFunc(err);
          resolveFunc(data);
        };
      }

      if (!identifier) {
        return callback({ error: "A name or user ID is required." });
      }

      var targetUserID = identifier;

      // If identifier is not a number, search in requests
      if (isNaN(identifier)) {
        friendModule.requests(function(err, requests) {
          if (err) return callback(err);
          
          var found = requests.find(function(req) {
            return req.name.toLowerCase().includes(identifier.toLowerCase());
          });
          
          if (!found) {
            return callback({ error: 'Could not find any friend request matching "' + identifier + '".' });
          }
          
          acceptRequest(found.userID, callback);
        });
      } else {
        acceptRequest(targetUserID, callback);
      }

      function acceptRequest(userID, cb) {
        var variables = {
          input: {
            friend_requester_id: userID,
            friending_channel: "FRIENDS_HOME_MAIN",
            actor_id: ctx.userID,
            client_mutation_id: Math.floor(Math.random() * 10 + 1).toString()
          },
          scale: 3
        };

        var form = {
          av: ctx.userID,
          __user: ctx.userID,
          __a: "1",
          fb_dtsg: ctx.fb_dtsg,
          jazoest: ctx.jazoest,
          lsd: ctx.lsd,
          fb_api_caller_class: "RelayModern",
          fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
          variables: JSON.stringify(variables),
          doc_id: "24630768433181357"
        };

        defaultFuncs
          .post("https://www.facebook.com/api/graphql/", ctx.jar, form, {})
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
          .then(function(res) {
            if (res.errors) throw new Error(JSON.stringify(res.errors));
            log.info('friend.accept', 'Accepted friend request from: ' + userID);
            cb(null, res.data);
          })
          .catch(function(err) {
            log.error('friend.accept', err);
            cb(err);
          });
      }

      return returnPromise;
    },

    /**
     * Get friend list
     * @param {string} userID - Optional user ID (defaults to current user)
     * @param {function} callback - Optional callback
     * @returns {Promise<Array>}
     */
    list: function(userID, callback) {
      var resolveFunc = function() {};
      var rejectFunc = function() {};
      var returnPromise = new Promise(function(resolve, reject) {
        resolveFunc = resolve;
        rejectFunc = reject;
      });

      // Handle optional userID parameter
      if (typeof userID === 'function') {
        callback = userID;
        userID = ctx.userID;
      }
      
      userID = userID || ctx.userID;

      if (!callback) {
        callback = function(err, data) {
          if (err) return rejectFunc(err);
          resolveFunc(data);
        };
      }

      var sectionToken = Buffer.from('app_section:' + userID + ':2356318349').toString('base64');
      var variables = {
        collectionToken: null,
        scale: 2,
        sectionToken: sectionToken,
        useDefaultActor: false,
        userID: userID
      };

      var form = {
        av: ctx.userID,
        __user: ctx.userID,
        __a: "1",
        fb_dtsg: ctx.fb_dtsg,
        jazoest: ctx.jazoest,
        lsd: ctx.lsd,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "ProfileCometTopAppSectionQuery",
        variables: JSON.stringify(variables),
        doc_id: "24492266383698794"
      };

      defaultFuncs
        .post("https://www.facebook.com/api/graphql/", ctx.jar, form, {})
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
        .then(function(res) {
          if (res.errors) throw new Error(JSON.stringify(res.errors));
          var formatted = formatFriends(res, 'list');
          log.info('friend.list', 'Found ' + formatted.length + ' friends for user: ' + userID);
          callback(null, formatted);
        })
        .catch(function(err) {
          log.error('friend.list', err);
          callback(err);
        });

      return returnPromise;
    },

    /**
     * Friend suggestions module
     */
    suggest: {
      /**
       * Get friend suggestions (People You May Know)
       * @param {number} limit - Max number of suggestions
       * @param {function} callback - Optional callback
       * @returns {Promise<Array>}
       */
      list: function(limit, callback) {
        var resolveFunc = function() {};
        var rejectFunc = function() {};
        var returnPromise = new Promise(function(resolve, reject) {
          resolveFunc = resolve;
          rejectFunc = reject;
        });

        // Handle optional limit parameter
        if (typeof limit === 'function') {
          callback = limit;
          limit = 30;
        }
        
        limit = limit || 30;

        if (!callback) {
          callback = function(err, data) {
            if (err) return rejectFunc(err);
            resolveFunc(data);
          };
        }

        var form = {
          av: ctx.userID,
          __user: ctx.userID,
          __a: "1",
          fb_dtsg: ctx.fb_dtsg,
          jazoest: ctx.jazoest,
          lsd: ctx.lsd,
          fb_api_caller_class: "RelayModern",
          fb_api_req_friendly_name: "FriendingCometPYMKPanelPaginationQuery",
          variables: JSON.stringify({ count: limit, cursor: null, scale: 3 }),
          doc_id: "9917809191634193"
        };

        defaultFuncs
          .post("https://www.facebook.com/api/graphql/", ctx.jar, form, {})
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
          .then(function(res) {
            if (res.errors) throw new Error(JSON.stringify(res.errors));
            var formatted = formatFriends(res, 'suggestions');
            log.info('friend.suggest.list', 'Found ' + formatted.length + ' suggestions');
            callback(null, formatted);
          })
          .catch(function(err) {
            log.error('friend.suggest.list', err);
            callback(err);
          });

        return returnPromise;
      },

      /**
       * Send friend request
       * @param {string} userID - User ID to send request to
       * @param {function} callback - Optional callback
       * @returns {Promise<object>}
       */
      request: function(userID, callback) {
        var resolveFunc = function() {};
        var rejectFunc = function() {};
        var returnPromise = new Promise(function(resolve, reject) {
          resolveFunc = resolve;
          rejectFunc = reject;
        });

        if (!callback) {
          callback = function(err, data) {
            if (err) return rejectFunc(err);
            resolveFunc(data);
          };
        }

        if (!userID) {
          return callback({ error: "userID is required." });
        }

        var variables = {
          input: {
            friend_requestee_ids: [userID],
            friending_channel: "FRIENDS_HOME_MAIN",
            actor_id: ctx.userID,
            client_mutation_id: Math.floor(Math.random() * 10 + 1).toString()
          },
          scale: 3
        };

        var form = {
          av: ctx.userID,
          __user: ctx.userID,
          __a: "1",
          fb_dtsg: ctx.fb_dtsg,
          jazoest: ctx.jazoest,
          lsd: ctx.lsd,
          fb_api_caller_class: "RelayModern",
          fb_api_req_friendly_name: "FriendingCometFriendRequestSendMutation",
          variables: JSON.stringify(variables),
          doc_id: "23982103144788355"
        };

        defaultFuncs
          .post("https://www.facebook.com/api/graphql/", ctx.jar, form, {})
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
          .then(function(res) {
            if (res.errors) throw new Error(JSON.stringify(res.errors));
            log.info('friend.suggest.request', 'Sent friend request to: ' + userID);
            callback(null, res.data);
          })
          .catch(function(err) {
            log.error('friend.suggest.request', err);
            callback(err);
          });

        return returnPromise;
      }
    }
  };

  return friendModule;
};
