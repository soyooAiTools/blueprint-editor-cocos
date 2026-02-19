// Cocos build/web-mobile → single-file HTML per channel
const fs = require('fs');
const path = require('path');

var commonJumpLogic = 'const ua=navigator.userAgent.toLowerCase();const isIOSUA=/iphone|ipad|ipod/.test(ua);const isDesktop=navigator.platform==="MacIntel"||navigator.platform==="Win32";const isRealIOSSafari=!isDesktop&&isIOSUA&&/safari/.test(ua)&&!/crios|fxios/.test(ua);let shouldJump=false;function tryJump(){if(!shouldJump)return;shouldJump=false;if(typeof doJump==="function")doJump();}if(isRealIOSSafari){document.addEventListener("touchend",tryJump,true);document.addEventListener("click",tryJump,true);}';

var CHANNELS = {
  appLovin: '!(function(){' + commonJumpLogic + 'function doJump(){var cfg=window.__channelConfig||{};var url=isIOSUA?cfg.iosLink:cfg.androidLink;typeof mraid!=="undefined"?mraid.open(url):window.open(url);}window.__onCTA=function(){shouldJump=true;if(!isRealIOSSafari)tryJump();};})();',
  facebook: '!(function(){' + commonJumpLogic + 'function doJump(){typeof FbPlayableAd!=="undefined"?FbPlayableAd.onCTAClick():window.open("");}window.__onCTA=function(){shouldJump=true;if(!isRealIOSSafari)tryJump();};})();',
  google: '!(function(){' + commonJumpLogic + 'function doJump(){typeof ExitApi!=="undefined"&&ExitApi.exit?ExitApi.exit():window.open("");}window.__onCTA=function(){shouldJump=true;if(!isRealIOSSafari)tryJump();};})();',
  tiktok: '!(function(){window.__onCTA=function(){window.openAppStore&&window.openAppStore();};})();',
  mintegral: '!(function(){window.gameReady&&window.gameReady();window.__onCTA=function(){window.install&&window.install();};})();',
  preview: '!(function(){window.__onCTA=function(){var url=/iphone|ipad|ipod/i.test(navigator.userAgent)?(window.__channelConfig||{}).iosLink:(window.__channelConfig||{}).androidLink;window.open(url,"_blank");};})();',
};

function* walkFiles(dir) {
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var full = path.join(dir, entries[i].name);
    if (entries[i].isDirectory()) yield* walkFiles(full);
    else yield full;
  }
}

function buildSingleHtml(buildDir) {
  var indexPath = path.join(buildDir, 'index.html');
  if (!fs.existsSync(indexPath)) throw new Error('index.html not found in ' + buildDir);
  var html = fs.readFileSync(indexPath, 'utf-8');

  // Inline CSS
  html = html.replace(/<link[^>]+href="([^"]+\.css)"[^>]*>/g, function(match, href) {
    var cssPath = path.join(buildDir, href);
    if (fs.existsSync(cssPath)) return '<style>' + fs.readFileSync(cssPath, 'utf-8') + '</style>';
    return match;
  });

  // Inline JS
  html = html.replace(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/g, function(match, src) {
    if (src.startsWith('http')) return match;
    var jsPath = path.join(buildDir, src);
    if (fs.existsSync(jsPath)) return '<script>' + fs.readFileSync(jsPath, 'utf-8') + '</script>';
    return match;
  });

  // Embed assets as base64 file dict + XHR interceptor
  var assetsDir = path.join(buildDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    var fileDict = {};
    for (var f of walkFiles(assetsDir)) {
      var rel = path.relative(buildDir, f).replace(/\\/g, '/');
      var ext = path.extname(f).toLowerCase();
      if (['.png','.jpg','.jpeg','.webp','.mp3','.ogg','.wav','.json','.bin','.cconb','.ccon'].indexOf(ext) >= 0) {
        fileDict[rel] = fs.readFileSync(f).toString('base64');
      }
    }
    // Also check for cocos-js/ or src/ dirs
    var extraDirs = ['cocos-js', 'src'];
    for (var d = 0; d < extraDirs.length; d++) {
      var extraDir = path.join(buildDir, extraDirs[d]);
      if (fs.existsSync(extraDir)) {
        for (var f of walkFiles(extraDir)) {
          var rel = path.relative(buildDir, f).replace(/\\/g, '/');
          if (!fileDict[rel]) fileDict[rel] = fs.readFileSync(f).toString('base64');
        }
      }
    }

    var interceptor = '<script>'
      + 'window.__fd=' + JSON.stringify(fileDict) + ';'
      + 'var _xo=XMLHttpRequest.prototype.open,_xs=XMLHttpRequest.prototype.send;'
      + 'XMLHttpRequest.prototype.open=function(m,u){if(u&&!u.startsWith("http")){var k=u.replace("./","");if(window.__fd[k]){this._k=k;return;}}return _xo.apply(this,arguments);};'
      + 'XMLHttpRequest.prototype.send=function(){if(this._k){var d=atob(window.__fd[this._k]);var a=new Uint8Array(d.length);for(var i=0;i<d.length;i++)a[i]=d.charCodeAt(i);try{Object.defineProperty(this,"status",{value:200});}catch(e){}try{Object.defineProperty(this,"readyState",{value:4});}catch(e){}try{Object.defineProperty(this,"response",{value:a.buffer});}catch(e){}try{Object.defineProperty(this,"responseText",{value:d});}catch(e){}if(this.onload)this.onload();return;}return _xs.apply(this,arguments);};'
      + '</script>';

    var headEnd = html.indexOf('</head>');
    if (headEnd > -1) html = html.slice(0, headEnd) + interceptor + html.slice(headEnd);
  }

  return html;
}

function convertToHtml(buildDir, options) {
  options = options || {};
  var channels = options.channels || ['appLovin', 'preview'];
  console.log('[converter] Building base HTML from: ' + buildDir);
  var baseHtml = buildSingleHtml(buildDir);
  var results = {};
  for (var i = 0; i < channels.length; i++) {
    var ch = channels[i];
    var script = CHANNELS[ch];
    if (!script) { console.warn('[converter] Unknown channel: ' + ch); continue; }
    var bodyEnd = baseHtml.indexOf('</body>');
    results[ch] = bodyEnd > -1 ? baseHtml.slice(0, bodyEnd) + '<script>' + script + '</script>' + baseHtml.slice(bodyEnd) : baseHtml + '<script>' + script + '</script>';
  }
  return results;
}

function convertAndSave(buildDir, outputDir, options) {
  options = options || {};
  var projectName = options.projectName || 'playable';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  var results = convertToHtml(buildDir, options);
  var saved = [];
  for (var ch in results) {
    var filename = projectName + '_' + ch + '.html';
    var outPath = path.join(outputDir, filename);
    fs.writeFileSync(outPath, results[ch], 'utf-8');
    var size = (Buffer.byteLength(results[ch]) / 1024).toFixed(0);
    console.log('[converter] Saved: ' + filename + ' (' + size + ' KB)');
    saved.push({ channel: ch, path: outPath, size: parseInt(size) });
  }
  return saved;
}

module.exports = { convertToHtml, convertAndSave, CHANNELS };

if (require.main === module) {
  var buildDir = process.argv[2];
  if (!buildDir) { console.log('Usage: node worker-html-converter.js <build/web-mobile/>'); process.exit(1); }
  convertAndSave(buildDir, './output', { channels: (process.argv[3]||'appLovin,preview').split(',') });
}
