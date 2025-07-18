;(function() {
    function varlenEncodingLength(val) {
        var len = 0;

        while (val > 127) {
            val >>= 7;
            len++;
        }
        len++;

        return len;
    }

    function varlenEncode(val, out, pos) {
        var len = 0;

        while (val > 127) {
            out[pos + len] = (val & 127) | 128;
            val >>= 7;
            len++;
        }
        out[pos + len++] = val & 127;

        return pos + len;
    }

    var resources = [
        'startTime',
        'redirectStart',
        'redirectEnd',
        'fetchStart',
        'domainLookupStart',
        'domainLookupEnd',
        'connectStart',
        'secureConnectionStart',
        'connectEnd',
        'requestStart',
        'responseStart',
        'responseEnd'
    ];

    function extractResourceTiming(rt) {
        var bLen = 0, id;
        for (id = 0; id < resources.length; id++) {
            bLen += varlenEncodingLength(Math.round(rt[resources[id]] * 1000));
        }
        var b = new Uint8Array(bLen);
        var idx = 0;
        for (id = 0; id < resources.length; id++) {
            idx = varlenEncode(Math.round(rt[resources[id]] * 1000), b, idx);
        }
        return btoa(String.fromCharCode.apply(null, b));
    }

    var p = '^https:\/\/([^.]*).wc.yahoodns.net\/i.gif$';
    var rx = new RegExp(p, 'gi');

    function extractBeacon(beaconURL) {
        rx.lastIndex = 0;
        var res = rx.exec(beaconURL);
        return res[1];
    }

    setTimeout(function() {
        var rand = Math.ceil((Math.random() * 99999999999999)).toString(36),
        pixie = [
            'https://t-a'+rand+'.wc.yahoodns.net/i.gif',
            'https://t-b'+rand+'.wc.yahoodns.net/i.gif',
            'https://t-c'+rand+'.wc.yahoodns.net/i.gif',
            'https://ipv4.wc.yahoodns.net/cs/' + rand,
            'https://ipv6.wc.yahoodns.net/cs/' + rand
        ],
        k = 0,
        results = {};

        while (k < pixie.length) {
            var beacon = new Image();

            /* Add client side beaconing when resource timing available */
            if (("performance" in window) && ("getEntriesByType" in window.performance)) {
                /* Error event will be raised by DOM for each image since the server will respond with 204 */
                /*jshint -W083*/
                beacon.addEventListener('error', function() {
                    var resourceList = window.performance.getEntriesByType("resource");
                    for (var i = 0; i < resourceList.length; i++) {
                        var name = resourceList[i].name;
                        /* Measure only the i.gif pixie image beacons */
                        if (resourceList[i].initiatorType === "img" && name.indexOf("wc.yahoodns.net/i.gif") > -1) {
                            var randName = extractBeacon(name);

                            if (!(randName in results)) {
                                try {
                                    results[randName] = extractResourceTiming(resourceList[i]);
                                } catch (err) {
                                    // Some features were not supported by the browser. Gracefully ignore this situation
                                }
                                var img = new Image();
                                img.src = 'https://r-' + randName + 'report.wc.yahoodns.net/cs/' + results[randName];
                            }
                        }
                    }
                }, false);
            }

            beacon.src = pixie[k++];
        }
    }, 2000);
})();