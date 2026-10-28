(function(doc, win, NeoAssistTag) {
    Array.prototype.forEach||(Array.prototype.forEach=function(r,t){for(var o=0,e=this.length;o<e;++o)r.call(t,this[o],o,this)}),Array.prototype.filter||(Array.prototype.filter=function(r){"use strict";if(null==this)throw new TypeError;var t=Object(this),o=t.length>>>0;if("function"!=typeof r)throw new TypeError;for(var e=[],i=2<=arguments.length?arguments[1]:void 0,n=0;n<o;n++)if(n in t){var f=t[n];r.call(i,f,n,t)&&e.push(f)}return e});




    var Neoassist = function() {
        /*! iFrame Resizer (iframeSizer.min.js ) - v4.1.0 - 2019-04-04
 *  Desc: Force cross domain iframes to size to content.
 *  Requires: iframeResizer.contentWindow.min.js to be loaded into the target frame.
 *  Copyright: (c) 2019 David J. Bradshaw - dave@bradshaw.net
 *  License: MIT
 */

var NeoassistLocalIframeResizePlugin=function(u){if("undefined"!=typeof window){var f=0,m=!1,n=!1,b="message".length,y="[iFrameSizer]",v=y.length,I=null,r=window.requestAnimationFrame,g={max:1,scroll:1,bodyScroll:1,documentElementScroll:1},M={},i=null,h={autoResize:!0,bodyBackground:null,bodyMargin:null,bodyMarginV1:8,bodyPadding:null,checkOrigin:!0,inPageLinks:!1,enablePublicMethods:!0,heightCalculationMethod:"bodyOffset",id:"iFrameResizer",interval:32,log:!1,maxHeight:1/0,maxWidth:1/0,minHeight:0,minWidth:0,resizeFrom:"parent",scrolling:!1,sizeHeight:!0,sizeWidth:!1,warningTimeout:5e3,tolerance:0,widthCalculationMethod:"scroll",onClosed:function(){},onInit:function(){},onMessage:function(){R("onMessage function not defined")},onResized:function(){},onScroll:function(){return!0}},x={};return function(){function t(e,n){n&&(function(){if(!n.tagName)throw new TypeError("Object is not a valid DOM element");if("IFRAME"!==n.tagName.toUpperCase())throw new TypeError("Expected <IFRAME> tag, found <"+n.tagName+">")}(),a(n,e),o.push(n))}var o;return function(){var e,n=["moz","webkit","o","ms"];for(e=0;e<n.length&&!r;e+=1)r=window[n[e]+"RequestAnimationFrame"];r||z("setup","RequestAnimationFrame not supported")}(),c(),function(e,n){var i;switch(o=[],(i=e)&&i.enablePublicMethods&&R("enablePublicMethods option has been removed, public methods are now always available in the iFrame"),typeof n){case"undefined":case"string":Array.prototype.forEach.call(document.querySelectorAll(n||"iframe"),t.bind(u,e));break;case"object":t(e,n);break;default:throw new TypeError("Unexpected data type ("+typeof n+")")}return o}}()}function w(){return window.MutationObserver||window.WebKitMutationObserver||window.MozMutationObserver}function F(e,n,i){e.addEventListener(n,i,!1)}function k(e,n,i){e.removeEventListener(n,i,!1)}function o(e){return y+"["+(i="Host page: "+(n=e),window.top!==window.self&&(i=window.parentIFrame&&window.parentIFrame.getId?window.parentIFrame.getId()+": "+n:"Nested host page: "+n),i)+"]";var n,i}function O(e){return M[e]?M[e].log:m}function z(e,n){E("log",e,n,O(e))}function R(e,n){E("warn",e,n,!0)}function E(e,n,i,t){!0===t&&"object"==typeof window.console&&console[e](o(n),i)}function e(n){function a(){e("Height"),e("Width"),A(function(){P(w),C(p),f("onResized",w)},w,"init")}function e(e){var n=Number(M[p]["max"+e]),i=Number(M[p]["min"+e]),t=e.toLowerCase(),o=Number(w[t]);z(p,"Checking "+t+" is in range "+i+"-"+n),o<i&&(o=i,z(p,"Set "+t+" to min value")),n<o&&(o=n,z(p,"Set "+t+" to max value")),w[t]=""+o}function s(e){return h.substr(h.indexOf(":")+b+e)}function d(i,t){var e,n,o;e=function(){var e,n;j("Send Page Info","pageInfo:"+(e=document.body.getBoundingClientRect(),n=w.iframe.getBoundingClientRect(),JSON.stringify({iframeHeight:n.height,iframeWidth:n.width,clientHeight:Math.max(document.documentElement.clientHeight,window.innerHeight||0),clientWidth:Math.max(document.documentElement.clientWidth,window.innerWidth||0),offsetTop:parseInt(n.top-e.top,10),offsetLeft:parseInt(n.left-e.left,10),scrollTop:window.pageYOffset,scrollLeft:window.pageXOffset,documentHeight:document.documentElement.clientHeight,documentWidth:document.documentElement.clientWidth,windowHeight:window.innerHeight,windowWidth:window.innerWidth})),i,t)},n=32,x[o=t]||(x[o]=setTimeout(function(){x[o]=null,e()},n))}function c(e){var n=e.getBoundingClientRect();return W(p),{x:Math.floor(Number(n.left)+Number(I.x)),y:Math.floor(Number(n.top)+Number(I.y))}}function l(e){var n=e?c(w.iframe):{x:0,y:0},i={x:Number(w.width)+n.x,y:Number(w.height)+n.y};z(p,"Reposition requested from iFrame (offset x:"+n.x+" y:"+n.y+")"),window.top!==window.self?window.parentIFrame?window.parentIFrame["scrollTo"+(e?"Offset":"")](i.x,i.y):R(p,"Unable to scroll to requested position, window.parentIFrame not found"):(I=i,u(),z(p,"--"))}function u(){!1!==f("onScroll",I)?C(p):H()}function f(e,n){return T(p,e,n)}var i,t,o,r,m,g,h=n.data,w={},p=null;"[iFrameResizerChild]Ready"===h?function(){for(var e in M)j("iFrame requested init",L(e),document.getElementById(e),e)}():y===(""+h).substr(0,v)&&h.substr(v).split(":")[0]in M?(g=h.substr(v).split(":"),w={iframe:M[g[0]]&&M[g[0]].iframe,id:g[0],height:g[1],width:g[2],type:g[3]},p=w.id,M[p]&&(M[p].loaded=!0),(m=w.type in{true:1,false:1,undefined:1})&&z(p,"Ignoring init message from meta parent page"),!m&&(r=!0,M[o=p]||(r=!1,R(w.type+" No settings for "+o+". Message was: "+h)),r)&&(z(p,"Received: "+h),t=!0,null===w.iframe&&(R(p,"IFrame ("+w.id+") not found"),t=!1),t&&function(){var e,i=n.origin,t=M[p]&&M[p].checkOrigin;if(t&&""+i!="null"&&!(t.constructor===Array?function(){var e=0,n=!1;for(z(p,"Checking connection is from allowed list of origins: "+t);e<t.length;e++)if(t[e]===i){n=!0;break}return n}():(e=M[p]&&M[p].remoteHost,z(p,"Checking connection is from: "+e),i===e)))throw new Error("Unexpected message received from: "+i+" for "+w.iframe.id+". Message was: "+n.data+". This error can be disabled by setting the checkOrigin: false option or by providing of array of trusted domains.");return!0}()&&function(){switch(M[p]&&M[p].firstRun&&M[p]&&(M[p].firstRun=!1),w.type){case"close":M[p].closeRequeston?T(p,"onCloseRequest",M[p].iframe):N(w.iframe);break;case"message":r=s(6),z(p,"onMessage passed: {iframe: "+w.iframe.id+", message: "+r+"}"),f("onMessage",{iframe:w.iframe,message:JSON.parse(r)}),z(p,"--");break;case"scrollTo":l(!1);break;case"scrollToOffset":l(!0);break;case"pageInfo":d(M[p]&&M[p].iframe,p),function(){function e(n,i){function t(){M[r]?d(M[r].iframe,r):o()}["scroll","resize"].forEach(function(e){z(r,n+e+" listener for sendPageInfo"),i(window,e,t)})}function o(){e("Remove ",k)}var r=p;e("Add ",F),M[r]&&(M[r].stopPageInfo=o)}();break;case"pageInfoStop":M[p]&&M[p].stopPageInfo&&(M[p].stopPageInfo(),delete M[p].stopPageInfo);break;case"inPageLink":e=s(9),i=e.split("#")[1]||"",t=decodeURIComponent(i),(o=document.getElementById(t)||document.getElementsByName(t)[0])?(n=c(o),z(p,"Moving to in page link (#"+i+") at x: "+n.x+" y: "+n.y),I={x:n.x,y:n.y},u(),z(p,"--")):window.top!==window.self?window.parentIFrame?window.parentIFrame.moveToAnchor(i):z(p,"In page link #"+i+" not found and window.parentIFrame not found"):z(p,"In page link #"+i+" not found");break;case"reset":S(w);break;case"init":a(),f("onInit",w.iframe);break;default:a()}var e,n,i,t,o,r}())):E("info",i=p,"Ignored: "+h,O(i))}function T(e,n,i){var t=null,o=null;if(M[e]){if("function"!=typeof(t=M[e][n]))throw new TypeError(n+" on iFrame["+e+"] is not a function");o=t(i)}return o}function p(e){var n=e.id;delete M[n]}function N(e){var n=e.id;z(n,"Removing iFrame: "+n);try{e.parentNode&&e.parentNode.removeChild(e)}catch(e){R(e)}T(n,"onClosed",n),z(n,"--"),p(e)}function W(e){null===I&&z(e,"Get page position: "+(I={x:window.pageXOffset!==u?window.pageXOffset:document.documentElement.scrollLeft,y:window.pageYOffset!==u?window.pageYOffset:document.documentElement.scrollTop}).x+","+I.y)}function C(e){null!==I&&(window.scrollTo(I.x,I.y),z(e,"Set page position: "+I.x+","+I.y),H())}function H(){I=null}function S(e){z(e.id,"Size reset requested by "+("init"===e.type?"host page":"iFrame")),W(e.id),A(function(){P(e),j("reset","reset",e.iframe,e.id)},e,"reset")}function P(i){function t(e){n||"0"!==i[e]||(n=!0,z(o,"Hidden iFrame detected, creating visibility listener"),function(){function n(){Object.values(M).forEach(function(n){function e(e){return"0px"===(M[n]&&M[n].iframe.style[e])}M[n]&&(i=M[n].iframe,null!==i.offsetParent)&&(e("height")||e("width"))&&j("Visibility change","resize",M[n].iframe,n);var i})}function e(e){z("window","Mutation observed: "+e[0].target+" "+e[0].type),s(n,16)}var i=w();i&&(t=document.querySelector("body"),o={attributes:!0,attributeOldValue:!1,characterData:!0,characterDataOldValue:!1,childList:!0,subtree:!0},new i(e).observe(t,o));var t,o}())}function e(e){var n;n=e,i.id?(i.iframe.style[n]=i[n]+"px",z(i.id,"IFrame ("+o+") "+n+" set to "+i[n]+"px")):z("undefined","messageData id not set"),t(e)}var o=i.iframe.id;M[o]&&(M[o].sizeHeight&&e("height"),M[o].sizeWidth&&e("width"))}function A(e,n,i){i!==n.type&&r?(z(n.id,"Requesting animation frame"),r(e)):e()}function j(e,n,i,t,o){var r,a=!1;t=t||i.id,M[t]&&(i&&"contentWindow"in i&&null!==i.contentWindow?(r=M[t]&&M[t].targetOrigin,z(t,"["+e+"] Sending msg to iframe["+t+"] ("+n+") targetOrigin: "+r),i.contentWindow.postMessage(y+n,r)):R(t,"["+e+"] IFrame("+t+") not found"),o&&M[t]&&M[t].warningTimeout&&(M[t].msgTimeout=setTimeout(function(){!M[t]||M[t].loaded||a||(a=!0,R(t,"IFrame has not responded within "+M[t].warningTimeout/1e3+" seconds. Check iFrameResizer.contentWindow.js has been loaded in iFrame. This message can be ignored if everything is working, or you can set the warningTimeout option to a higher value or zero to suppress this warning."))},M[t].warningTimeout)))}function L(e){return e+":"+M[e].bodyMarginV1+":"+M[e].sizeWidth+":"+M[e].log+":"+M[e].interval+":"+M[e].enablePublicMethods+":"+M[e].autoResize+":"+M[e].bodyMargin+":"+M[e].heightCalculationMethod+":"+M[e].bodyBackground+":"+M[e].bodyPadding+":"+M[e].tolerance+":"+M[e].inPageLinks+":"+M[e].resizeFrom+":"+M[e].widthCalculationMethod}function a(i,e){function n(e){var n=e.split("Callback");if(2===n.length){var i="on"+n[0].charAt(0).toUpperCase()+n[0].slice(1);this[i]=this[e],delete this[e],R(l,"Deprecated: '"+e+"' has been renamed '"+i+"'. The old method will be removed in the next major version.")}}var t,o,r,a,s,d,c,l=(""===(t=i.id)&&(i.id=(o=e&&e.id||h.id+f++,null!==document.getElementById(o)&&(o+=f++),t=o),m=(e||{}).log,z(t,"Added missing iframe ID: "+t+" ("+i.src+")")),t);l in M&&"iFrameResizer"in i?R(l,"Ignored iFrame, already setup."):(d=(d=e)||{},M[l]={firstRun:!0,iframe:i,remoteHost:i.src.split("/").slice(0,3).join("/")},function(e){if("object"!=typeof e)throw new TypeError("Options is not an object")}(d),Object.keys(d).forEach(n,d),function(e){for(var n in h)Object.prototype.hasOwnProperty.call(h,n)&&(M[l][n]=Object.prototype.hasOwnProperty.call(e,n)?e[n]:h[n])}(d),M[l]&&(M[l].targetOrigin=!0===M[l].checkOrigin?""===(c=M[l].remoteHost)||"file://"===c?"*":c:"*"),function(){switch(z(l,"IFrame scrolling "+(M[l]&&M[l].scrolling?"enabled":"disabled")+" for "+l),i.style.overflow=!1===(M[l]&&M[l].scrolling)?"hidden":"auto",M[l]&&M[l].scrolling){case"omit":break;case!0:i.scrolling="yes";break;case!1:i.scrolling="no";break;default:i.scrolling=M[l]?M[l].scrolling:"no"}}(),function(){function e(e){1/0!==M[l][e]&&0!==M[l][e]&&(i.style[e]=M[l][e]+"px",z(l,"Set "+e+" = "+M[l][e]+"px"))}function n(e){if(M[l]["min"+e]>M[l]["max"+e])throw new Error("Value for min"+e+" can not be greater than max"+e)}n("Height"),n("Width"),e("maxHeight"),e("minHeight"),e("maxWidth"),e("minWidth")}(),"number"!=typeof(M[l]&&M[l].bodyMargin)&&"0"!==(M[l]&&M[l].bodyMargin)||(M[l].bodyMarginV1=M[l].bodyMargin,M[l].bodyMargin=M[l].bodyMargin+"px"),r=L(l),(s=w())&&(a=s,i.parentNode&&new a(function(e){e.forEach(function(e){Array.prototype.slice.call(e.removedNodes).forEach(function(e){e===i&&N(i)})})}).observe(i.parentNode,{childList:!0})),F(i,"load",function(){var e,n;j("iFrame.onload",r,i,u,!0),e=M[l]&&M[l].firstRun,n=M[l]&&M[l].heightCalculationMethod in g,!e&&n&&S({iframe:i,height:0,width:0,type:"init"})}),j("init",r,i,u,!0),M[l]&&(M[l].iframe.iFrameResizer={close:N.bind(null,M[l].iframe),removeListeners:p.bind(null,M[l].iframe),resize:j.bind(null,"Window resize","resize",M[l].iframe),moveToAnchor:function(e){j("Move to anchor","moveToAnchor:"+e,M[l].iframe,l)},sendMessage:function(e){j("Send Message","message:"+(e=JSON.stringify(e)),M[l].iframe,l)}}))}function s(e,n){null===i&&(i=setTimeout(function(){i=null,e()},n))}function t(){"hidden"!==document.visibilityState&&(z("document","Trigger event: Visiblity change"),s(function(){d("Tab Visable","resize")},16))}function d(i,t){Object.keys(M).forEach(function(e){var n;M[n=e]&&"parent"===M[n].resizeFrom&&M[n].autoResize&&!M[n].firstRun&&j(i,t,document.getElementById(e),e)})}function c(){F(window,"message",e),F(window,"resize",function(){var e;z("window","Trigger event: "+(e="resize")),s(function(){d("Window "+e,"resize")},16)}),F(document,"visibilitychange",t),F(document,"-webkit-visibilitychange",t)}}();

        var frameNumber = 1;
        var logEnable = true;
        var widgets = [];
        var srcURL = 'https://cdn.atendimen.to';

        function log(str, type) {
            if (!logEnable) {
                return;
            }

            if (typeof console != 'undefined' && typeof console.log == 'function') {
                if (typeof type == 'undefined') {
                    console.log(str);
                } else {
                    console[type](str);
                }
            }
        }

        function getElTarget(target) {
            var el = 'body' == target ? doc.body: doc.getElementById(target);
            if (!el) {
                throw new TypeError('Target [' + target + '] element not found...');
                return false;
            }

            return el;
        }

        function initialize(targetWindow) {
            if (!targetWindow || typeof targetWindow.postMessage !== 'function') return;

            const prefix = '[iFrameSizer]message:\"eaction:';
            const initialize = NeoAssistTag.initialize || {};
            const fields = initialize.fields || {};

            for (const field in fields) {
                const value = fields[field];
                targetWindow.postMessage(prefix + 'set-form:' + field + ':' + value + '\"', srcURL);
            }

            if (initialize.route) {
                targetWindow.postMessage(prefix + 'change-route:' + initialize.route + '\"', srcURL);
            }

            if (initialize.question) {
                targetWindow.postMessage(prefix + 'submit-question:' + initialize.question + '\"', srcURL);
            }
        }

        function sendDimensions(targetWindow) {
            if (!targetWindow || typeof targetWindow.postMessage !== 'function') return;

            targetWindow.postMessage({
                name: 'dimensions',
                width: window.innerWidth,
                height: window.innerHeight,
            }, srcURL);
        }

        function createIframe(params) {
            var iframe = doc.createElement('iframe');
            iframe.setAttribute('class', 'neoasssist-widget-frame neoasssist-widget-frame-' + params.frameNumber);
            iframe.setAttribute('src', params.src);
            iframe.setAttribute('width', '0');
            iframe.setAttribute('id', 'neoassist-widget-frame-' + params.frameNumber);
            iframe.setAttribute('allowTransparency', 'true');
            iframe.setAttribute('scrolling', 'no');
            iframe.setAttribute('frameBorder', '0');
            iframe.setAttribute('marginheight', '0');
            iframe.setAttribute('marginwidth', '0');
            iframe.setAttribute('allow', 'microphone;camera');
            iframe.setAttribute('allowFullScreen', '')
            setCss(iframe, {
                'display': 'block',
                'border': '0px',
                'overflow': 'hidden'
            });

            window.addEventListener('resize', () => {
                sendDimensions(iframe.contentWindow);
            });

            window.addEventListener('message', (event) => {
                if (event.origin !== srcURL) return;

                if (event.data.name === 'central-ready' && iframe.contentWindow) {
                    initialize(iframe.contentWindow);
                }

                if (event.data.name === 'get-dimensions' && iframe.contentWindow) {
                    sendDimensions(iframe.contentWindow);
                }

                if (event.data.name === 'url' && iframe.contentWindow) {
                    if (typeof iframe.contentWindow.postMessage !== 'function') return;

                    iframe.contentWindow.postMessage({
                        name: 'url',
                        url: window.location.href,
                    }, srcURL);
                }

                if (event.data.name === 'set-styles') {
                    const { name, code, ...styleProps } = event.data;
                    if (params.app_id !== code) return;
                    Object.assign(iframe.style, styleProps);
                }
            });

            return iframe;
        }

        function messageCallback(message, api, iframe) {
            if (message.event == 'setCss') {
                setCss(iframe, message.data);
            }

            if (message.event == 'loadWidget') {
                var app_id = message.data.app_id || "";
                var target = message.data.target || "";
                var mode = message.data.mode || "";
                var page = message.data.page || "";
                var locale = message.data.locale || "pt_BR";
                var sizeWidth = message.data.sizeWidth || true;
                var type = message.data.type || null;
                if (!app_id || app_id == "") {
                    new Error("app_id not defined")
                }
                loadWidget(app_id, target, mode, page, locale, sizeWidth, type);
            }

            if (message.event == 'close') {
                api.close();
            }

            if (message.event == 'resize') {
                api.resize();
            }

            if (message.event == 'scrollTo') {
                var xCoord = parseInt(message.data.xCoord) || 0;
                var yCoord = parseInt(message.data.yCoord) || 0;
                window.top.scrollTo(xCoord, yCoord);
            }
        }

        function setCss(el, cssPosition) {
            for (var key in cssPosition) {
                if (typeof cssPosition[key] != 'undefined') {
                    el.style[key] = cssPosition[key];
                }
            }
        }

        function loadWidget(app_id, target, mode, page, locale, sizeWidth, type) {
            if (typeof target == 'undefined') {
                target = 'body';
            }

            if (typeof mode == 'undefined') {
                mode = 'current';
            }

            if (typeof page == 'undefined') {
                page = '';
            }

            if (typeof locale == 'undefined') {
                locale = 'pt_BR';
            }

            if (typeof sizeWidth == 'undefined') {
                sizeWidth = true;
            }

            const centralPath = type ? `central-${type}` : 'widget';

            if (win._NAWidgetLoaded.filter(function(app) { return app.app_id == app_id && app.target == target; }).length > 0) {
                if (page) {
                    for (var iWid = 0; iWid < widgets.length; iWid++) {
                        if (widgets[iWid].app_id == app_id) {
                            widgets[iWid].api.changeRoute(page);
                            return;
                        }
                    }
                    return;
                }
                log('App [' + app_id + '] already loaded in this destination [' + target + ']');
                return;
            }

            if (locale != 'pt_BR' && locale != 'en' && locale != 'es') {
                locale = 'pt_BR';
                console.warn(locale + ' - Invalid locale [pt_BR, es, en], set to pt_BR');
            }

            function getCookie(cname) {
                var name = cname + "=";
                var decodedCookie = decodeURIComponent(document.cookie);
                var ca = decodedCookie.split(';');
                for(var i = 0; i <ca.length; i++) {
                    var c = ca[i];
                    while (c.charAt(0) == ' ') {
                    c = c.substring(1);
                    }
                    if (c.indexOf(name) == 0) {
                    return c.substring(name.length, c.length);
                    }
                }
                return "";
            }

            var ModeTestActive = (mode == 'test' || getCookie('NeoAssistTestMode' + app_id) == 'Active');
            var version = ModeTestActive ? 'test' : 'current';
            version += (page != '') ? ('#/' + page) : '';
            var widget_url = srcURL + '/' + centralPath + '/' + app_id + '/' + version + '?v=202604';
            var number = frameNumber++;
            var params = {'app_id': app_id, 'target': target, 'mode': mode, "frameNumber": number, "src": widget_url};
            var targetEl = getElTarget(target);
            var isMobile = (function () {
                var check = false;
                (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
                return check;
            })();

            if (targetEl) {
                if (ModeTestActive) {
                    console.warn('NEOASSIST[' + app_id + ']: Widget running in test mode');
                }

                var iframe = createIframe(params);
                targetEl.appendChild(iframe);

                if (typeof NeoassistLocalIframeResizePlugin == 'undefined') {
                    console.warn('NEOASSIST[' + app_id + ']: iFrameResize not found');
                    return;
                }

                params.api = NeoassistLocalIframeResizePlugin( {
                    "autoResize": !isMobile,
                    "log": false,
                    "warningTimeout": false,
                    "sizeWidth": sizeWidth,
                    "checkOrigin": false,
                    "widthCalculationMethod": "taggedElement",
                    "heightCalculationMethod": "taggedElement",
                    "onMessage": function(data) {
                        messageCallback(data.message, params.api, data.iframe);
                        if (typeof params.api.receiveMessage == 'function') {
                            params.api.receiveMessage.call(win, data, data.message, params.api);
                        }
                    },
                    onInit: function (iframeEl) {
                        var initialize = NeoAssistTag.initialize || {};

                        if (initialize.route) {
                            params.api.changeRoute(initialize.route);
                        }

                        if (initialize.question) {
                            params.api.submitQuestion(initialize.question);
                        }

                        if (typeof initialize.locale != 'undefined' && initialize.locale != 'pt_BR') {
                            console.log(initialize.locale)
                            locale = initialize.locale;
                        }

                        if (locale != '' && locale != 'pt_BR') {
                            params.api.setLocale(locale);
                        }

                        params.api.setFormField(initialize.fields);
                    }
                }, iframe )[0].iFrameResizer;
                params.api.receiveMessage = function(iframe, message, api) { };
                params.api.setFormField = function (field, value) {
                    if (value) {
                        params.api.sendMessage("eaction:set-form:" + field + ":" + value);
                        return;
                    }

                    for (var key in field) {
                        params.api.setFormField(key, field[key]);
                    }
                }
                params.api.changeRoute = function (route) {
                    params.api.sendMessage("eaction:change-route:" + route);
                }
                params.api.submitQuestion = function (question) {
                    params.api.sendMessage("eaction:submit-question:" + question);
                }
                params.api.setCss = function (css) { setCss(iframe, css); }
                params.api.loadWidget = function (app_id, target, mode, page, locale, sizeWidth, type) {
                    loadWidget(app_id, target, mode, page, locale, sizeWidth, type);
                }
                params.api.setLocale = function setLocale(locale) {
                    if (!locale && locale != 'pt_BR' && locale != 'en' && locale != 'es') {
                        console.error(locale + ' - Invalid locale [pt_BR, es, en]');
                        return;
                    }
                    params.api.sendMessage("eaction:set-locale:" + locale);
                }
                params.api.setTestMode = function setTestMode(value) {
                    if (typeof value != 'boolean') {
                        value = false;
                    }

                    var key = 'NeoAssistTestMode' + app_id;
                    if (value) {
                        var dateExpires = new Date((new Date) . getTime() + 30 * 60000); // 30 minutes
                        var expires = dateExpires.toUTCString().replace('GMT', 'UTC');

                        document.cookie = key + "=Active; expires=" + expires + "; path=/; secure=true;";
                    } else {
                        document.cookie = key + "=Deactive; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure=true;";
                    }

                    win.location = win.location;
                }
                params.api.isMobile = isMobile;

                widgets.push(params);
                win._NAWidgetLoaded.push({'app_id': app_id, 'target': target});
            }
        };

        return {
            widgets: widgets,
            loadWidget: loadWidget
        }
    }

    if (typeof win.NeoAssistTag == 'undefined') {
        win.NeoAssistTag = {};
    }

    if (typeof win._NAWidgetLoaded == 'undefined') {
        win._NAWidgetLoaded = [];
    }

    if (typeof win.NeoAssistTag.sdk == 'undefined') {
        win.NeoAssistTag.sdk = Neoassist();
    }

    var initial_load = [{"app_id":"21820fecb43222a83e7d08e53e38842c","mode":"current","target":"body","locale":"pt_BR","sizeWidth":true,"type":null}];
    if (initial_load.length > 0) {
        initial_load.forEach(function(app) { win.NeoAssistTag.sdk.loadWidget(app.app_id, app.target, app.mode, '', app.locale, app.sizeWidth, app.type); });
    }

}).call(null, document, window, NeoAssistTag);
