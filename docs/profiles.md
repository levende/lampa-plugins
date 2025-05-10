# Profiles Plugin

## Overview
The plugin enables profile management in the Lampa app without requiring the **[CUB](https://cub.red)** service. Additionally, it seamlessly integrates with the **[Lampac service](https://github.com/immisterio/Lampac)** service for data synchronization, ensuring a smooth and connected user experience.

## Features
- **Independent Profile Management**: Add and manage profiles in the Lampa app without relying on the CUB service.
- **Flexible Profile Configuration**: Customize profiles with various settings to fit your needs.
- **Broadcasting**: Broadcasting functions using a self-hosted lampac server
- **Soft Refresh**: Switch profiles without restarting the app, ensuring a smooth experience.
- **Integration with Other Plugins**: Extend functionality by integrating with third-party plugins.

## **Configuration (Lampac)**  
To enable profile support for users, modifications must be made to the **`accsdb`** section in the **`init.conf`** file:  
- Add an array of available profiles to the **`params`** field. This setting can be applied globally for all users or individually for specific users.  
- To create **global profiles**, define the configuration directly in **`accsdb.params`**.  
- To assign **user-specific profiles**, add the profile configuration inside the **`params`** property of the respective user object.  

The plugin supports **profile priority handling**, meaning it will first attempt to use user-specific profiles. If none are found, it will fall back to the global settings.

### Example Configuration
```json
"params": {
  "profiles": [
    {
      "id": ""
    },
    {
      "id": "john", 
      "title": "John", 
      "icon": "https://cdn.cub.red/img/profiles/f_1.png",
      "params": {
        "adult": true,
        "extraSettings": {
          "hideAnime": true
        }
      }
    },
    {
      "id": "anna", 
      "title": "Anna", 
      "icon": "https://cdn.cub.red/img/profiles/f_2.png",
      "params": {
        "hideHorrors": true
      }
    }
  ]
}
```

### Parameter Descriptions

| **Parameter** | **Description** |
|---------------|-----------------|
| `id`          | A custom string that serves as the profile's identifier. It is used for data synchronization. <br> - If the `id` is an empty string (`""`), the main account will be used for synchronization, with the data available without the plugin. <br> - If the `id` is not provided, the profile's index in the list will be used as the identifier. <br> - **Note:** Changing the profile's `id` will make the data associated with the old `id` unavailable under the new one. |
| `title`       | The profile's display name. This is optional. If not provided, it will be automatically generated. |
| `icon`        | The profile's display icon. It can either be: <br> - A direct URL to an image (e.g., `https://cdn.cub.red/img/profiles/f_1.png`). <br> - A base64-encoded image (e.g., `data:image/png;base64,iVBORw0K...`). <br> This parameter is optional. If not provided, a default icon will be used. |
| `params`      | Additional parameters that can be used for integration with other plugins (see "Plugin Events" section) |

## Integrations

The plugin supports multiple integration methods: event sending during operation and pre-configuration before starting.

### Plugin Events

The plugin sends messages when the status of profiles changes:
- **changed** - occurs when the profile is loaded (at the moment the application is opened and when the user changes the profile).

Sample code for subscribing to plugin events:
```javascript
Lampa.Listener.follow('profile', function(event) {
  if (evnt.type != 'changed') return;

  if (event.params.adult) {
      // Code for disabling sensitive information
  }
});
```
#### Event fields

| **Parameter** | **Description** |
|---------------|-----------------|
| `type`        | The profile event type. |
| `profileId`   | THe `id` of the profile for which the event occurred. |
| `params`      | Data from the `params` field of the profile object, which can be specified in init.conf (see example for the `John` profile) |

### Pre-configuration
The plugin supports pre-configuration of certain settings. These configurations must be applied **before** the plugin is loaded. To do this, the window.profiles_settings object should be used.

| **Parameter** | **Default value** | **Description** |
|---------------|-------------------|-----------------|
| `profiles`            |`[]`         | List of available profiles in the application (with any additional parameters). If this list is not empty, profiles from the server will be ignored. |
| `host`                |`window.location.origin`           | The url to a Lampac server; |
| `defaultProfileIcon`  |`https://levende.github.io/lampa-plugins/assets/profile_icon.png`           | The picture that will be applied for profiles without icon field |
| `showSettings`        |`true`           | A boolean flag indicating whether the **Profiles plugin** settings should be added in the application settings.
| `syncEnabled`        |`true`           | A boolean flag indicating whether if profile synchronization is enabled
| `broadcastEnabled`        |`true`           | broadcasting between devices with the same profile is enabled.


Sample code for a plugin that adds profiles to the application without allowing users to change settings (can be used even in the standalone Lampa application):
```javascript
(function () {
    'use strict';

    window.profiles_settings = {
        profiles: [
            {
              id: '',
              name: 'Profile 1',
              params: {
                adult: true,
              },
            },
            {
              id: 'profile_2',
              icon: 'https://cdn.cub.red/img/profiles/f_2.png'
            }
       ]
    };

    Lampa.Utils.putScript(['https://levende.github.io/lampa-plugins/profiles.js'], function() {});
})();
```

## Installation  
You can install the plugin using the following link: [profiles.js](https://levende.github.io/lampa-plugins/profiles.js)

---

## Other Plugins
Other available plugins can be found using the following link: [All plugins](https://levende.github.io/lampa-plugins)

---
