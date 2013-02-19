var voodoo = function() {
  var VOODOO_START = Date.now(),
  SHOCKWAVE_FLASH = 'Shockwave Flash',
  SHOCKWAVE_FLASH_AX = 'ShockwaveFlash.ShockwaveFlash',
  FLASH_MIME_TYPE = 'application/x-shockwave-flash',
  voo = {},
  nav = navigator,
  regexs = {
      mozilla: /^mozilla\/(\d\.?\d*)$/,
      gecko: /^gecko\/(\d+)$/,
      presto: /^presto\/(\w+\.?\w+?\.?\w+?)$/,
      webkit: /^applewebkit\/?(\S+)?$/,
      netscape: /^netscape\/(\w+\.?\w+?\.?\w+?)$/,
      firefox: /^firefox\/(\S+)/,
      safari: /^safari\/(\S+)?$/,
      chrome: /chrome\/(\S+)?$/,
      songbird: /^songbird\/(\S+)$/,
      flock: /flock\/(\S+)?$/,
      icab: /icab\/?(\S+)?$/,
      iceweasel: /iceweasel\/?(\S+)?$/,
      rockmelt: /rockmelt\/?(\S+)?$/,
      fennec: /fennec\/?(\S+)?$/,
      opera: /^opera\/(\d+\.?\w*\.?\w*)/,
      version: /^version\/(\S+)$/,
      operaversion: /^\d+\.?\w*\.?\w*/,
      windows: /^windows\s(nt)?\s?(\S+)/,
      macintoshIntel: /^intel\smac\sos\sx\s(\S+)$/,
      macintoshPpc: /^ppc\smac\sos\sx\s?(\S+)?$/,
      ios: /^cpu\s(\S+)?\s?os\s(\S+)/,
      rv: /^rv:(\w+\.?\w+?\.?\w+?)$/,
      msie: /^msie\s(\S+)$/,
      operamini: /opera\smini\/(\S+)\/?/,
      operamobile: /opera\smobi\/(\S+)/,
      linux: /(\S+)?\s?linux\s?(\S+)?/,
      sunos: /^sunos\s?(\S+)?/,
      chromeos: /^cros\s(\S+)\s(\S+)/,
      android: /^android\s?(\S+)?$/,
      blackberry: /^blackberry(\S+)?$/,
      freebsd: /^freebsd\s(\S+)/,
      openbsd: /^openbsd\s(\S+)$/,
      trident: /^trident\/?(\S+)?$/
  };
  
  voo.ua = function(u) { 
    var u = u || navigator.userAgent;
    u = u.toLowerCase();

    var platformTokens = {
        isMozillaCompatible: function(token, platform, i) {
          var result;
          if(i === 0 && (result = token.match(regexs.mozilla))) {
            platform.browser.mozilla = parseFloat(result[1]);
          }
        },

        isGeckoEngine: function(token, platform, i) {
          var result;
          if((result = token.match(regexs.gecko))) {
            platform.browser.engine = 'gecko';
            platform.browser.engineVersion = parseFloat(result[1]);
          }
        },

        isPrestoEngine: function(token, platform, i) {
          var regex = regexs.presto, result;
          if((result = token.match(regex))) {
            platform.browser.engine = 'presto';
            platform.browser.engineVersion = result[1];
          }
        },

        isWebkitEngine: function(token, platform, i) {
          var regex = regexs.webkit, result;
          if((result = token.match(regex))) {
            platform.browser.name = platform.browser.name || 'safari';
            platform.browser.engine = 'webkit';
            platform.browser.engineVersion = result[1] || '';
          }
        },

        isNetscape: function(token, platform, i) {
          var regex = regexs.netscape, result;
          if((result = token.match(regex))) {
            platform.browser.name = 'netscape';
            platform.browser.version = result[1];
          }
        },

        isFirefox: function(token, platform, i, tokens) {
          if(platform.browser.name == 'iceweasel' ||
             platform.browser.name == 'flock' ||
             platform.browser.name == 'opera mini' ||
             platform.browser.name == 'opera mobile') {
            return false;
          }
          
          var regex = regexs.firefox, result, next;
          if((result = token.match(regex))) {
            if(result[1]) {
              result[1] = result[1].split(';')[0];
            }
            
            platform.browser.name = 'firefox';
            platform.browser.version = result[1] || '';
          } else if(token === 'firefox') {
            platform.browser.name = 'firefox';
            platform.browser.version = '';
            next = tokens[i+1];
            if(next) {
              if(next[0] == '(') {
                next = next.substr(1, next.length-2);
              }
              platform.browser.version = next;
            }
          }
        },

        isSafari: function(token, platform, i) {
          var regex = regexs.safari, result;
          if((result = token.match(regex))  && !platform.browser.name) {
            platform.browser.name = 'safari';
            platform.browser.build = result[1] || '';
            if(!platform.browser.version) {
              platform.browser.version = result[1] || '';
            }
          } else if(token === 'safari' &&
              platform.browser.name !== 'android webkit browser') {
            platform.browser.name = 'safari';
          }
        },

        isChrome: function(token, platform, i) {
          var regex = regexs.chrome, result;
          if((result = token.match(regex)) && 
              platform.browser.name != 'rockmelt' && 
              platform.browser.name != 'flock') {
            platform.browser.name = 'chrome';
            platform.browser.build = platform.browser.version = result[1] || '';
          }
        },

        isSongbird: function(token, platform, i, tokens) {
          var regex = regexs.songbird, result, next;
          if((result = token.match(regex))) {
            platform.browser.name = 'songbird';
            platform.browser.version = result[1];
            next = tokens[i+1];
            if(next && (result = next.match(/^\((\d+)\)$/))) {
              platform.browser.build = parseFloat(result[1]);
            }
          }
        },
        
        isFlock: function(token, platform) {
          var regex = regexs.flock, result;
          if((result = token.match(regex))) {
            platform.browser.name = 'flock';
            platform.browser.version = result[1] || '';
          }
        },
        
        isICab: function(token, platform, i, tokens) {
          var regex = regexs.icab, result;
          if(token === 'icab') {
            if(tokens[i+1] && !isNaN(parseFloat(tokens[i+1]))) {
              platform.browser.name = 'icab';
              platform.browser.version = tokens[i+1];
            }
          } else if((result = token.match(regex))) {
            platform.browser.name = 'icab';
            platform.browser.version = result[1] || '';
          }
        },
        
        isIceweasel: function(token, platform) {
          var regex = regexs.iceweasel, result;
          if((result = token.match(regex))) {
            platform.browser.name = 'iceweasel';
            platform.browser.version = result[1] || '';
          }
        },
        
        isRockmelt: function(token, platform) {
          var regex = regexs.rockmelt, result;
          if((result = token.match(regex))) {
            platform.browser.name = 'rockmelt';
            platform.browser.version = result[1] || '';
          }
        },
        
        isFennec: function(token, platform) {
          var regex = regexs.fennec, result;
          if((result = token.match(regex))) {
            platform.browser.name = 'fennec';
            platform.browser.version = result[1] || '';
          }
        },

        isOpera: function(token, platform, i) {
          var regex = regexs.opera, result;
          if((result = token.match(regex))) {
            platform.browser.name = 'opera';
            platform.browser.version = result[1];
          }
        },

        browserVersion: function(token, platform, i) {
          var regex = regexs.version, result;
          if((result = token.match(regex)) && 
              (!platform.browser.name ||
               platform.browser.name == 'opera' ||
               platform.browser.name == 'safari' ||
               platform.browser.name == 'opera mobile')) {
            platform.browser.version = result[1];
          }
        },

        isOperaPrefix: function(token, platform, i, tokens) {
          if(token === 'opera' &&
              platform.browser.name != 'opera mobile' &&
              platform.browser.name != 'opera mini') {
            platform.browser.name = 'opera';
            
            var next = tokens[i+1], result;
            if(next && (result = next.match(regexs.operaversion))) {
              platform.browser.version = result[0];
            }
          }
        },
        
        androidwebkit: function(token, platform) {
          if(token == 'mobile' && platform.platform.os == 'android') {
            platform.browser.name = 'android webkit browser';
          }
        },

        parentheses: {
          platformWindows: function(token, platform, i) {
            var regex = regexs.windows, result;
            if(token === 'windows') {
              platform.platform.name = 'windows';
            } else if((result = token.match(regex))) {
              platform.platform = {
                  name: 'windows',
                  os: this.windowsOSTable[result[0]]
              };

              if(typeof platform.platform.os === 'string') {
                platform.platform.os = platform.platform.os.toLowerCase();
              } else {
                platform.platform.os = 'unknown';
              }
            }
          },

          platformMacintosh: function(token, platform, i) {
            var regex = regexs.macintoshIntel, result,
              regexppc = regexs.macintoshPpc, version;

            if(token == 'macintosh' || token == 'mac_powerpc') {
              platform.platform.name = 'macintosh';
            } else if((result = token.match(regexppc))) {
              platform.platform = {
                  name: 'macintosh',
                  os: 'OS X',
                  cpu: 'ppc'
              };
              
              if(result[1]) {
                if(result[1].indexOf('_') != -1) {
                  result[1] = result[1].replace('_', '.');
                }
                platform.platform.version = result[1];
                version = result[1].split('.').slice(0, 2).join('.');
                platform.platform.os = this.macintoshOSTable[version];
              }
            } else if((result = token.match(regex))) {
              platform.platform = {
                  name: 'macintosh',
                  version: result[1]
              };
              
              if(result[1]) {
                if(result[1].indexOf('_') != -1) {
                  result[1] = result[1].replace(/_/g, '.');
                  version = result[1].split('.').slice(0, 2).join('.');
                }

                platform.platform.version = result[1];
                platform.platform.os = this.macintoshOSTable[version];
              }
            }
          },
          
          platformIOS: function(token, platform) {
            var regex = regexs.ios, result, version;
            if((result = token.match(regex))) {
              if(result[2]) {
                if(result[2].indexOf('_') != -1) {
                  result[2] = result[2].replace(/_/g, '.');
                  version = result[2].split('.').slice(0, 2).join('.');
                }
                
                platform.platform.name = 'macintosh';
                platform.platform.version = result[2];
                platform.platform.os = 'ios';
              }
            }
          },
          
          iUnit: function(token, platform) {
            if(token == 'ipod' || token == 'iphone' || token == 'ipad') {
              platform.platform.unit = token;
            }
          },

          wow64: function(token, platform, i) {
            if(token == 'wow64') {
              platform.browser.wow64 = true;
            }
          },

          rv: function(token, platform, i) {
            var regex = regexs.rv, result;
            if((result = token.match(regex))) {
              platform.browser.branchTag = result[1];
            }
          },

          msie: function(token, platform, i) {
            var regex = regexs.msie, result;
            if((result = token.match(regex))) {
              platform.browser.name = 'internet explorer';
              platform.browser.version = result[1];
            }
          },
          
          icab: function(token, platform) {
            var regex = regexs.icab, result;
            if((result = token.match(regex))) {
              platform.browser.name = 'icab';
              platform.browser.version = result[1] || '';
            }
          },
          
          operamini: function(token, platform) {
            var regex = regexs.operamini, result, version;
            if((result = token.match(regex))) {
              platform.browser.name = 'opera mini';
              platform.browser.version = result[1].split('/')[0];
            }
          },
          
          operamobile: function(token, platform) {
            var regex = regexs.operamobile, result, version;
            if((result = token.match(regex))) {
              platform.browser.name = 'opera mobile';
              platform.browser.build = result[1];
            }
          },

          x11: function(token, platform, i) {
            if(token === 'x11') {
              platform.platform.x11 = true;
            }
          },

          linux: function(token, platform, i) {
            var regex = regexs.linux, result;
            if((result = token.match(regex))) {
              platform.platform.os = 'linux';
              platform.platform.name = 'linux';
              platform.platform.cpu = result[1] || result[2];
            }
          },
          
          opensolaris: function(token, platform) {
            if(token == 'opensolaris') {
              platform.platform.os = 'opensolaris';
              platform.platform.name = 'opensolaris';
            }
          },
          
          sunos: function(token, platform) {
            var regex = regexs.sunos, result;
            if((result = token.match(regex))) {
              platform.platform.os = 'sunos';
              platform.platform.name = 'sunos';
              platform.platform.version = result[1];
            }
          },
          
          chromeos: function(token, platform) {
            var regex = regexs.chromeos, result;
            if((result = token.match(regex))) {
              platform.platform.os = 'chrome os';
              platform.platform.name = 'chrome os';
              platform.platform.cpu = result[1];
              platform.platform.version = result[2];
            }
          },
          
          android: function(token, platform) {
            var regex = regexs.android, result;
            if((result = token.match(regex))) {
              platform.platform.os = 'android';
              platform.platform.name = 'android';
              platform.platform.version = result[1];

              // We can assume this as a start.
              platform.browser.name = 'android webkit browser'; 
            }
          },
          
          blackberry: function(token, platform) {
            var regex = regexs.blackberry, result;
            if((result = token.match(regex))) {
              platform.platform.os = 'blackberryos';
              platform.platform.name = 'blackberryos';
              platform.platform.version = result[1];
            }
          },
          
          simpleOSs: function(token, platform) {
            if(token == 'symbos') {
              platform.platform.os = 'symbos';
              platform.platform.name = 'symbos';
            } else if(token == 'unix') {
              platform.platform.os = 'unix';
              platform.platform.name = 'unix';
            }
          },
          
          freebsd: function(token, platform) {
            var regex = regexs.freebsd, result;
            if((result = token.match(regex))) {
              platform.platform.os = 'linux';
              platform.platform.name = 'freebsd';
              platform.platform.cpu = result[1];
            }
          },
          
          openbsd: function(token, platform) {
            var regex = regexs.openbsd, result;
            if((result = token.match(regex))) {
              platform.platform.os = 'linux';
              platform.platform.name = 'openbsd';
              platform.platform.cpu = result[1];
            }
          },

          isTridentEngine: function(token, platform, i) {
            var regex = regexs.trident, result;
            if((result = token.match(regex))) {
              platform.browser.name = platform.browser.name || 
                'internet explorer';
              platform.browser.engine = 'trident';
              platform.browser.engineVersion = result[1] || '';
            }
          },

          windowsOSTable: {
            'windows nt 6.1': 'Windows 7',
            'windows nt 6.0': 'Windows Vista',
            'windows nt 5.2': 'Windows Server 2003; Windows XP x64 Edition',
            'windows nt 5.1': 'Windows XP',
            'windows nt 5.0': 'Windows 2000',

            'windows 3.1': 'Windows 3.1',
            'windows 98': 'Windows 98',

            'window nt 6.1 x64': 'Windows 7',
            'window nt 6.0 x64': 'Windows Vista'
          },
          
          macintoshOSTable: {
	    '10.8': 'Mountain Lion',  
            '10.7': 'Lion',
            '10.6': 'Snow Leopard',
            '10.5': 'Leopard',
            '10.4': 'Tiger',
            '10.3': 'Panther',
            '10.2': 'Jaguar'
          }
        },

        parseInformationParentheses: function(token, platform, i) {
          if(token[0] === '('/* && token[token.length-1] === ')'*/) {
            token = token.substr(1, token.length-2);
            var pTokens = token.split(';');
            for(var i = 0, length = pTokens.length; i < length; i++) {
              for(var t in this.parentheses) {
                if(typeof this.parentheses[t] === 'function') {
                  this.parentheses[t](pTokens[i]
                      .replace(/^\s\s*/, '')
                      .replace(/\s\s*$/, '').
                      toLowerCase(), platform, i, pTokens);
                }
              }
            }
          }
        }
    };
    
    
    // Find Useragent and Platform
    var uaTokenizer = /(\([^\)]+\))|\s?\s/, 
        i, length, tokens = [], t = u.split(uaTokenizer),
        platform = {platform: {}, browser: {}}, token, d = null, a = null,
        flashVersion = [0,0,0];

    // Find Flash version (Thanks SWFObject)
    if(nav && typeof nav.plugins != 'undefined' && 
        typeof nav.plugins[SHOCKWAVE_FLASH] == 'object') {
      d = nav.plugins[SHOCKWAVE_FLASH].description;
      if(d && !(typeof nav.mimeTypes != 'undefined' && 
            nav.mimeTypes[FLASH_MIME_TYPE] && 
            !nav.mimeTypes[FLASH_MIME_TYPE].enabledPlugin)) {
        d = d.replace(/^.*\s+(\S+\s+\S+$)/, "$1");
        flashVersion[0] = parseInt(d.replace(/^(.*)\..*$/, "$1"), 10);
        flashVersion[1] = parseInt(d.replace(/^.*\.(.*)\s.*$/, "$1"), 10);
        flashVersion[2] = /[a-zA-Z]/.test(d) ?
          parseInt(d.replace(/^.*[a-zA-Z]+(.*)$/, "$1"), 10) : 0;
      }
    } else if(window && typeof window.ActiveXObject != 'undefined') {
      try {
        a = new ActiveXObject(SHOCKWAVE_FLASH_AX);
        if(a && (d = a.GetVariable('$version'))) {
          d = d.split(' ')[1].split(',');
          flashVersion = [parseInt(d[0], 10), parseInt(d[1], 10), 
                          parseInt(d[2], 10)];
        }
      } catch(e) {}
    }
    platform.browser.flashVersion = flashVersion.join('.');

    // Sort out empty results
    for(i = 0, length = t.length; i < length; i++) {
      if(typeof t[i] !== 'undefined' && 
          (typeof t[i] === 'string' && t[i].length !== 0)) {
        tokens.push(t[i].toLowerCase());
      }
    } 

    // Inspect tokens
    for(i = 0, length = tokens.length; i < length; i++) {
      for(var t in platformTokens) {
        if(typeof platformTokens[t] === 'function') {
          platformTokens[t](tokens[i], platform, i, tokens);
        }
      }
    }

    return platform;
  };
  
  voo.time = Date.now() - VOODOO_START;
  return voo;
}();
