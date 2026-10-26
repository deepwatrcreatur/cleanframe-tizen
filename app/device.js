/* Public Tizen application APIs. No Mac server, network address or credentials. */
(function () {
  'use strict';
  var IDS = {
    stremio: 'IkWsFHtOY9.Stremio', netflix: 'org.tizen.netflix-app',
    disneyplus: 'MCmYXNxgcu.DisneyPlus', youtube: '9Ur5IzDKqV.TizenYouTube',
    appletv: 'com.samsung.tv.aria-video', primevideo: 'org.tizen.primevideo',
    abciview: 'mWK87Xghap.ABCiview', sbs: 'OyE7OuxlUi.SBSOnDemand',
    applemusic: 'org.tizen.apple.apple-music',
    hdmi1: 'source.hdmi1', hdmi2: 'source.hdmi2', hdmi3: 'source.hdmi3', hdmi4: 'source.hdmi4',
    tvviewer: 'org.tizen.tv-viewer'
  };
  var STREAMING = ['as6cYRgkPy.Binge', '73iTZRTc34.Stan', '5b8c3eb16b.BeamCTVDev',
    'KaLitts8bq.tenplaySamsungTizen', 'eYuOiOLYQX.KayoSports', 'Ne2ZsPWdKl.9NOW',
    '3KA0pm7a7V.TubiTV', 'rJeHak5zRg.Spotify', 'icp4AvUPiA.7plus'];
  var CONSUMER_SYSTEM = ['org.tizen.browser', 'com.microsoft.copilot'];
  var EXTRA_BRANDS = {'rJeHak5zRg.Spotify': 'spotify', '5b8c3eb16b.BeamCTVDev': 'hbomax', '3KA0pm7a7V.TubiTV': 'tubi'};
  var INTERNAL = ['adplatform.ADPlayer', 'WykOS4t4F0.cmsWebApp', '25emanual3.emanual',
    'ZODRT12q2l.WebAccountExtension', 'ByJlgt0XeD.CastSettingsApp', 'tv6pbVMQFF.PrivacyChoices'];
  var SELF = 'nClrkHome1.FrameHome';
  function api() { return window.tizen && window.tizen.application; }
  function unavailable(done) {
    done({ message: 'Open CleanFrame on the TV to use this control.', detail: 'The web preview cannot control the TV.' });
  }
  function failure(err) {
    return { message: 'The TV could not open this screen.', detail: err && (err.message || err.name) || 'Try again, or press the remote’s Home button to return to CleanFrame.' };
  }
  function bounded(done) {
    var finished = false, timer = setTimeout(function () { finish({ message: 'The TV did not respond. Please try again.' }); }, 8000);
    function finish(err, value) { if (finished) return; finished = true; clearTimeout(timer); done(err, value); }
    return finish;
  }
  function launchApp(id, done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    if (id && id.indexOf('source.hdmi') === 0) {
      var portMatch = id.match(/hdmi(\d+)/i);
      var portNum = portMatch ? parseInt(portMatch[1], 10) : 1;
      try {
        if (window.tizen && window.tizen.systeminfo && window.tizen.tvwindow) {
          window.tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (videoSource) {
            var sources = (videoSource.connected || []).concat(videoSource.disconnected || []);
            var target = null;
            for (var i = 0; i < sources.length; i++) {
              if (sources[i].type === 'HDMI' && sources[i].number === portNum) {
                target = sources[i];
                break;
              }
            }
            if (target) {
              try {
                window.tizen.tvwindow.setSource(target, function () {
                  api().launch('org.tizen.tv-viewer', function () { finish(null); }, function (err) { finish(failure(err)); });
                }, function () {
                  api().launch('org.tizen.tv-viewer', function () { finish(null); }, function (err) { finish(failure(err)); });
                });
                return;
              } catch (e) {
                api().launch('org.tizen.tv-viewer', function () { finish(null); }, function (err) { finish(failure(err)); });
                return;
              }
            }
            api().launch('org.tizen.tv-viewer', function () { finish(null); }, function (err) { finish(failure(err)); });
          }, function () {
            api().launch('org.tizen.tv-viewer', function () { finish(null); }, function (err) { finish(failure(err)); });
          });
          return;
        }
      } catch (e) {}
      api().launch('org.tizen.tv-viewer', function () { finish(null); }, function (err) { finish(failure(err)); });
      return;
    }
    try { api().launch(id, function () { finish(null); }, function (err) { finish(failure(err)); }); }
    catch (err) { finish(failure(err)); }
  }
  function launch(brand, done) {
    if (!IDS[brand]) { done({message: 'This app has no launch target.'}); return; }
    launchApp(IDS[brand], done);
  }
  function art(done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try {
      var data = [new tizen.ApplicationControlData('mode', ['fullscreen']), new tizen.ApplicationControlData('requester', ['mobile'])];
      var control = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/default', null, null, null, data);
      api().launchAppControl(control, 'org.tizen.art-app', function () { finish(null); }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  function home(done) { launchApp('com.samsung.tv.csfs', done); }
  function settings(done) { launchApp('com.samsung.tv.coba.setting', done); }
  function apps(done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try {
      api().getAppsInfo(function (list) {
        var known = {}, seen = {}, result = [];
        Object.keys(IDS).forEach(function (brand) { known[IDS[brand]] = brand; });
        list.forEach(function (a) {
          var primary = !!known[a.id], stream = STREAMING.indexOf(a.id) >= 0;
          var consumer = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/.test(a.id) || CONSUMER_SYSTEM.indexOf(a.id) >= 0;
          if (a.id === SELF || INTERNAL.indexOf(a.id) >= 0 || seen[a.id] || !a.name || (!primary && !stream && (!a.show || !consumer))) return;
          if (!primary && /(?:service|worker|preview|promotion|plugin|launcher|test|sdk|^ep[ -]|factory|daemon)/i.test(a.name + ' ' + a.id)) return;
          if (/-dummy$/.test(a.id) || a.id === 'com.samsung.tv.cobalt-yt') return;
          seen[a.id] = true;
          result.push({ appId: a.id, name: a.name, brand: known[a.id] || EXTRA_BRANDS[a.id] || '', icon: a.iconPath || '', rank: primary ? Object.keys(IDS).indexOf(known[a.id]) : (stream ? 20 : 30) });
        });
        result.push({ appId: 'source.hdmi1', name: 'HDMI 1', brand: 'hdmi1', icon: '', rank: 11 });
        result.push({ appId: 'source.hdmi2', name: 'HDMI 2', brand: 'hdmi2', icon: '', rank: 12 });
        result.push({ appId: 'source.hdmi3', name: 'HDMI 3', brand: 'hdmi3', icon: '', rank: 13 });
        result.push({ appId: 'source.hdmi4', name: 'HDMI 4', brand: 'hdmi4', icon: '', rank: 14 });
        result.push({ appId: 'org.tizen.tv-viewer', name: 'Live TV / HDMI', brand: 'tv', icon: '', rank: 15 });
        result.sort(function (a, b) { return a.rank - b.rank || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        finish(null, result);
      }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  window.FrameDevice = { launch: launch, launchApp: launchApp, art: art, home: home, settings: settings, apps: apps };
}());
