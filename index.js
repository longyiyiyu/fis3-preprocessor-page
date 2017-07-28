var esprima = require('esprima');
var esquery = require('esquery');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var Syntax = estraverse.Syntax;

var BEFORE = "window.onload = function() {\
    var _ua = navigator.userAgent.toLowerCase() || '';\
    function isWeiXin() {\
        return _ua.indexOf('micromessenger') !== -1 || (_ua.indexOf('educationapp') != -1 && getCookie('uid_type') == 2);\
    }\
    function getAuthKey() {\
        var a2 = getCookie('uid_a2');\
        var skey = getCookie('p_skey') || getCookie('skey');\
        return isWeiXin() ? (a2 || skey) : skey;\
    }\
    function encryptSkey(str) {\
        var hash = 5381;\
        if (!str) {\
            return '';\
        }\
        for (var i = 0, len = str.length; i < len; ++i) {\
            hash += (hash << 5) + str.charAt(i).charCodeAt();\
        }\
        return hash & 0x7fffffff;\
    }\
    function getBkn() {\
        return encryptSkey(getAuthKey());\
    }\
    var virtualPage = (function() {\
        return {\
            tools: {\
                bom: {\
                    get: function(n) {\
                        var m = (window.location.search + window.location.hash).match(new RegExp('(\\\\?|#|&)' + n + '=([^#&]*)(#|&|$)'));\
                        return !m ? '' : decodeURIComponent(m[2]);\
                    },\
                    @bom@\
                },\
                mobile: {\
                    qqVersion: function() {\
                        var _match = _ua.match(/qq\\/(\\d+\\.\\d+(\\.\\d+)?)/i);\
                        return _match && _match[1] || 0;\
                    },\
                    isIOS: function() {\
                        if ((/iPhone|iPod/i).test(navigator.userAgent)) {\
                            return true;\
                        }\
                        return false;\
                    },\
                    @mobile@\
                },\
                @all@\
            }\
        };\
    })();\
    var tools = virtualPage.tools;\
    var from = tools.bom.get('from');\
    if (from === 'ios_dongtai') {\
        WIN_NAME.set(window.DYNAMIC_KEY, 1);\
    }\
    function addDefaultParams(url) {\
        var _isIOS = tools.mobile.isIOS() && tools.mobile.qqVersion();\
        var bkn = getBkn();\
        if (from === 'ios_dongtai') {\
            url += (url.indexOf('?') < 0 ? '?' : '&') + 'is_ios_h5=' + (_isIOS ? 1 : 0);\
        } else {\
            url += (url.indexOf('?') < 0 ? '?' : '&') + 'is_ios=' + (_isIOS ? 1 : 0);\
        }\
        if (_isIOS) {\
            url += '&is_ios_qq=1';\
        }\
        if (bkn) {\
            url += '&bkn=' + bkn;\
        }\
        return url;\
    }\
    window.PRELOADDATA = {};\
    window.PRELOADDATADONE = false;\
    var count = 0;\
    function onGetData(key, data, total) {\
        window.PRELOADDATA[key] = data;\
        if (++count >= total) {\
            window.PRELOADDATADONE = true;\
            window.$ && $(document).trigger('onPreloadDataReady');\
        }\
    }";
var AFTER = "\
    var isDirect = !!document.documentElement.getAttribute('alpaca');\
    !isDirect && (function(opt) {\
        var k, v, params, url;\
        var total = Object.keys(opt).length;\
        for (k in opt) {\
            v = opt[k];\
            params = (v.param && 'function' === typeof v.param) ? v.param.call(virtualPage) : v.param;\
            url = addDefaultParams(v.url);\
            params && Object.keys(params).forEach(function(k) {\
                url += '&' + k + '=' + encodeURIComponent(params[k]);\
            });\
            (function(key) {\
                require.getData(url, function(data) {\
                    onGetData(key, data && data.result, total);\
                }, function() {\
                    onGetData(key, {\
                        retcode: -1\
                    }, total);\
                }, {\
                    reportPath: url.replace(/\\?.*/, '')\
                });\
            })(k || v.url);\
        }\
    })(preloadDataOpt);";

function expo(content, file, options) {
    var rigthItem;
    var dataStr;
    var matches;
    var ast;
    var dataFile;
    var dataFileName = file.dirname + '/data.page.js';
    var dataESFileName = file.dirname + '/data.page.es6.js';
    var dataFileContent;
    var hasDataFile = fis.util.isFile(dataFileName);
    var hasESDataFile = fis.util.isFile(dataESFileName);

    if (hasDataFile || hasESDataFile) {
        dataFile = hasDataFile ? fis.file(dataFileName) : fis.file(dataESFileName);
        dataFileContent = dataFile.getContent();

        // console.log('>>> test file:', file.pageName, /preload\s*:\s*true/.test(dataFileContent));
        if (!/preload\s*:\s*true/.test(dataFileContent)) {
            // 快速检测
            return content;
        }

        ast = esprima.parse(dataFileContent);

        var list = [];
        var extStrReg = /@preload\.tools\.(\w*?)\{\{([\s\S]*?)\}\}/g;
        var bomStr, mobileStr, toolsStr;
        estraverse.traverse(ast, {
            enter: function(node, parent) {
                var m;

                if (Syntax.Property === node.type) {
                    m = esquery(node, 'Property > ObjectExpression > Property[key.name="preload"][value.value=true]');
                    if (m.length) {
                        list.push(node);
                        this.skip();
                    }
                }
            }
        });

        // console.log('>>> list:', list);
        if (list.length) {
            ast = {
                "type": "Program",
                "body": [{
                    "type": "VariableDeclaration",
                    "declarations": [{
                        "type": "VariableDeclarator",
                        "id": {
                            "type": "Identifier",
                            "name": "preloadDataOpt"
                        },
                        "init": {
                            "type": "CallExpression",
                            "callee": {
                                "type": "FunctionExpression",
                                "id": null,
                                "params": [],
                                "body": {
                                    "type": "BlockStatement",
                                    "body": [{
                                        "type": "ReturnStatement",
                                        "argument": {
                                            "type": "ObjectExpression",
                                            "properties": list
                                        }
                                    }]
                                },
                                "generator": false,
                                "expression": false
                            },
                            "arguments": []
                        }
                    }],
                    "kind": "var"
                }],
                "sourceType": "script"
            };
            dataStr = escodegen.generate(ast);
            content.replace(extStrReg, function(str, name, value) {
                switch (name) {
                    case 'bom':
                        bomStr = value;
                        break;
                    case 'mobile':
                        mobileStr = value;
                        break;
                    case 'all':
                        toolsStr = value;
                        break;
                    default:
                        break;
                }
            });
            
            content = [BEFORE.replace(/@(\w*?)@/g, function(str, name) {
                var ret;
                switch (name) {
                    case 'bom':
                        ret = bomStr;
                        break;
                    case 'mobile':
                        ret = mobileStr;
                        break;
                    case 'all':
                        ret = toolsStr;
                        break;
                    default:
                        break;
                }
                return ret || '';
            }), dataStr, AFTER, content, '};'].join('');
            
            // fis.util.write(fis.util(file.dirname, 'test.js'), content);
        }
    }

    return content;
}

module.exports = expo;
