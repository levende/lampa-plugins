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
      "icon": "https://cdn.cub.red/img/profiles/f_1.png"
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

---

## Other Plugins
Other available plugins can be found using the following link: [All plugins](https://levende.github.io/lampa-plugins)

---