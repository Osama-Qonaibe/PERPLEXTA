/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-aeb6ecaf'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "telemetry.js",
    "revision": "1e63f915fb01c5cfc9c77a2ccc094fdc"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "init-theme.js",
    "revision": "ea32b5767108eb56028d404d711af820"
  }, {
    "url": "index.html",
    "revision": "2f8b2e2f0fc7502d34118856ff187f4d"
  }, {
    "url": "assets/web-D7RUSWEc.js",
    "revision": null
  }, {
    "url": "assets/useToast-DVnwrNI5.js",
    "revision": null
  }, {
    "url": "assets/tools-DS7N4r-w.js",
    "revision": null
  }, {
    "url": "assets/target-DGu2nRDM.js",
    "revision": null
  }, {
    "url": "assets/settings-2-DzjuyAdp.js",
    "revision": null
  }, {
    "url": "assets/scale-BWMRavEP.js",
    "revision": null
  }, {
    "url": "assets/recharts-VJXqqDIX.js",
    "revision": null
  }, {
    "url": "assets/react-query-DM-PSnEu.js",
    "revision": null
  }, {
    "url": "assets/purify.es-DP5U8-sc.js",
    "revision": null
  }, {
    "url": "assets/mic-Cnap0jxl.js",
    "revision": null
  }, {
    "url": "assets/layout-grid-Dz65zn3t.js",
    "revision": null
  }, {
    "url": "assets/index.es-MC3roHQ-.js",
    "revision": null
  }, {
    "url": "assets/index-UR0euZKA.js",
    "revision": null
  }, {
    "url": "assets/index-CgKlg8C3.js",
    "revision": null
  }, {
    "url": "assets/index-CO8PSrDz.css",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-QH1iLAAe.js",
    "revision": null
  }, {
    "url": "assets/history-EX3VLo0F.js",
    "revision": null
  }, {
    "url": "assets/circle-x-Dhxa4_B2.js",
    "revision": null
  }, {
    "url": "assets/adminUtils-lJrBBwtW.js",
    "revision": null
  }, {
    "url": "assets/Terms-B4vOZxIG.js",
    "revision": null
  }, {
    "url": "assets/SubscriptionPage-Jh7xqBs_.js",
    "revision": null
  }, {
    "url": "assets/StudioPage-UwmtsCgF.js",
    "revision": null
  }, {
    "url": "assets/SharedSnapshotPage-UBL-hNjk.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-C2xTt_Op.js",
    "revision": null
  }, {
    "url": "assets/RewardsPage-D7JYsSgO.js",
    "revision": null
  }, {
    "url": "assets/ResetPasswordPage-BVNt25nU.js",
    "revision": null
  }, {
    "url": "assets/RecommendationsPage-B41gKCwi.js",
    "revision": null
  }, {
    "url": "assets/Privacy-BQkvOYnA.js",
    "revision": null
  }, {
    "url": "assets/GoogleHubPage-DqmTA_Cz.js",
    "revision": null
  }, {
    "url": "assets/ContentContainer-BvLF_sop.js",
    "revision": null
  }, {
    "url": "assets/ChatPage-ChxINoPL.js",
    "revision": null
  }, {
    "url": "assets/ChatPage-Cg1sXqY3.css",
    "revision": null
  }, {
    "url": "assets/AdminDashboard-CGAv4TPT.js",
    "revision": null
  }, {
    "url": "assets/About-nF8vDNKO.js",
    "revision": null
  }, {
    "url": "manifest.webmanifest",
    "revision": "b9f5e97c65e53cd522a1b00251feff32"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//]
  }));
  workbox.registerRoute(/\/uploads\/.*/i, new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(/\/api\/.*/i, new workbox.NetworkOnly(), 'GET');

}));
