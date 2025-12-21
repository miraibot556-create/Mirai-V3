"use strict";

/**
 * Share API Module
 * Get preview information for Facebook posts
 * 
 * @author Priyansh Rajput
 * @github https://github.com/priyanshufsdev
 * @license MIT
 */

var utils = require("../utils");
var log = require("npmlog");

/**
 * Format preview result from GraphQL response
 * @private
 */
function formatPreviewResult(data) {
  if (data.errors) {
    throw data.errors[0];
  }
  
  var previewData = data.data?.xma_preview_data;
  if (!previewData) {
    throw { error: "Could not generate a preview for this post." };
  }
  
  return {
    postID: previewData.post_id,
    header: previewData.header_title,
    subtitle: previewData.subtitle_text,
    title: previewData.title_text,
    previewImage: previewData.preview_url,
    favicon: previewData.favicon_url,
    headerImage: previewData.header_image_url
  };
}

module.exports = function(defaultFuncs, api, ctx) {
  /**
   * Get preview information for a Facebook post
   * Useful for sharing posts or getting post metadata
   * 
   * @param {string} postID - The ID of the post to preview
   * @param {function} callback - Optional callback function
   * @returns {Promise<object>}
   */
  return function getPostPreview(postID, callback) {
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

    // Validation
    if (!postID) {
      var error = 'A postID is required to generate a preview.';
      log.error('share', error);
      return callback({ error: error });
    }

    var variables = {
      shareable_id: postID.toString(),
      scale: 3
    };

    var form = {
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: 'CometXMAProxyShareablePreviewQuery',
      variables: JSON.stringify(variables),
      doc_id: '28939050904374351'
    };

    defaultFuncs
      .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function(resData) {
        var result = formatPreviewResult(resData);
        log.info('share', 'Generated preview for post: ' + postID);
        callback(null, result);
      })
      .catch(function(err) {
        log.error('share', err);
        callback(err);
      });

    return returnPromise;
  };
};
