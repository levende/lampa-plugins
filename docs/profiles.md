# Profiles Plugin

## Overview
The **Profiles Plugin** is designed to organize user profiles without relying on CUB services. This plugin can only be used in applications where the server is based on **[Lampac](https://github.com/immisterio/Lampac)**.

## Features
- **User Profiles**: Allows the creation and management of user profiles within the application, independent of CUB services.
- **Customizable**: You can define profiles globally or individually for specific users.
- **Soft Refresh**  The application updates data without a full reload after a user profile change. (Can be changed in settings).

## Configuration
To enable and configure profiles in Lampac, you need to make adjustments to the `accsdb` settings:

1. Add `profiles` to the **params** section in your `accsdb` configuration.
2. This setting can be applied globally for all users and accounts or individually for specific users, with individual settings taking priority over the global configuration.
3. Disable CUB syncronization if it enabled.
4. Add the plugin to the application.

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
        "adult": true
      }
    },
    {
      "id": "anna", 
      "title": "Anna", 
      "icon": "https://cdn.cub.red/img/profiles/f_2.png"
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

## Plugin Events

The plugin sends messages when the status of profiles changes. There are two types of events: loaded and selected
- **changed** - occurs when the profile is loaded (at the moment of application opening and at the moment of profile changing by the user)

Sample code for subscribing to plugin events
```json
Lampa.Listener.follow('profiles', function(event) {
    if (evnt.type != 'changed') return;

    if (event.params.adult) {
        // Code for disabling sensitive information
    }
});
```

### Event fields

| **Parameter** | **Description** |
|---------------|-----------------|
| `type`        | The profile event type. |
| `profileId`   | THe `id` of the profile for which the event occurred. |
| `params`      | Data from the `params` field of the profile object, which can be specified in init.conf (see example for the `John` profile) |


## Installation  
You can install the plugin using the following link: [profiles.js](https://levende.github.io/lampa-plugins/profiles.js)

---

## Other Plugins
Other available plugins can be found using the following link: [All plugins](https://levende.github.io/lampa-plugins)

---