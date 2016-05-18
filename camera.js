(function () {
  freeboard.loadDatasourcePlugin({
    type_name: "nest_camera",
    display_name: "Nest Camera",
    external_scripts: ["https://cdn.firebase.com/js/client/2.4.2/firebase.js"],
    settings: [
      {
        name: "authorization_code",
        display_name: "Authorization Code",
        type: "text",
        description: "Your personal authorization code generated from <a href=\"https://home.nest.com/login/oauth2?client_id=6a45d3f5-b753-4ede-9ebb-f445d87ce088&state=" + getCSRFtoken() + "\" target=\"_blank\">here</a>."
      },
      {
        name: "refresh_time",
        display_name: "Refresh Every",
        type: "number",
        suffix: "seconds",
        default_value: 10
      }
    ],
    newInstance: function (settings, newInstanceCallback, updateCallback) {
      newInstanceCallback(new nestCamera(settings, updateCallback));
    }
  });

  function getCSRFtoken () {
    var possibleChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012345679",
        token = "";

    for (var i = 0; i < 16; i++) {
      token += possibleChars[Math.floor(Math.random() * possibleChars.length)];
    }

    return token;
  }

  var nestCamera = function (settings, updateCallback) {
    var self = this,
        refreshTimer,
        access_token,
        ref,
        onValueChange,
        currentSettings = settings;

    function getData () {
      $.ajax({
        type: "POST",
        url: "https://cors-anywhere.herokuapp.com/api.home.nest.com/oauth2/access_token?client_id=6a45d3f5-b753-4ede-9ebb-f445d87ce088&code=" + currentSettings.authorization_code + "&client_secret=ywEKPggAhlKSFg9xxcFI0kock&grant_type=authorization_code",
        data: {
          code: currentSettings.authorization_code,
          client_id: "6a45d3f5-b753-4ede-9ebb-f445d87ce088",
          client_secret: "ywEKPggAhlKSFg9xxcFI0kock",
          grant_type: "authorization_code"
        },
        success: function (payload) {
          access_token = payload.access_token;
          ref = new Firebase('wss://developer-api.nest.com');
          ref.authWithCustomToken(access_token);
          onValueChange = ref.on('value', function (snapshot) {
            var data = snapshot.val();

            var newData = {
              access_token: data.metadata.access_token,
              client_version: data.metadata.client_version
            };

            var name;
            Object.keys(data.devices).forEach(function (deviceType) {
              Object.keys(data.devices[deviceType]).forEach(function (device) {
                if (data.devices[deviceType][device].name_long) {
                  newData[data.devices[deviceType][device].name_long] = data.devices[deviceType][device];
                }
              });
            });

            Object.keys(data.structures).forEach(function (structure) {
              if (data.structures[structure].name) {
                newData[data.structures[structure].name] = data.structures[structure];
              }
            });

            updateCallback(newData);
          });
        },
        error: function (xhr, status, error) {
        },
        dataType: "JSON"
      });
    }

    var refreshTimer;

    function createRefreshTimer (interval) {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }

      refreshTimer = setInterval(function () {
        getData();
      }, interval);
    }

    self.onSettingsChanged = function (newSettings) {
      currentSettings = newSettings;
    };

    self.updateNow = function () {
    };

    self.onDispose = function () {
      clearInterval(refreshTimer);
      refreshTimer = undefined;
      ref.off('value', onValueChange);
    };

    createRefreshTimer(currentSettings.refresh_time * 1000);
  };
}());
