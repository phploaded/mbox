# mBox Fullscreen Lightbox jQuery Plugin - Developer Documentation

## Live Demo and Example code here http://phploaded.github.io/mbox/

## Overview
**mBox** is a jQuery-based lightbox plugin designed for displaying images in a sleek and interactive way. It supports features like fullscreen mode, slideshow, rotation, keyboard navigation, and customizable options for title and description display.

---

## Installation
To use the mBox plugin, include the following files in your HTML:

```html
<link rel="stylesheet" href="mbox.css"> <!-- Include the stylesheet -->
<script src="https://code.jquery.com/jquery-3.x.x.min.js"></script>
<script src="mbox.js"></script>
```

---

## Usage
### Basic Initialization
Attach the mBox plugin to your desired element(s):
```javascript
$(document).ready(function() {
  $('.gallery-item').mBox({
    showTitle: true,
    fullScreen: true
  });
});
```

---

## Options
You can customize mBox by passing an options object when initializing the plugin.

| Option         | Default      | Description                                                                 |
|----------------|--------------|-----------------------------------------------------------------------------|
| `getTitle`     | `.title`     | Selector to fetch the title element.                                       |
| `showTitle`    | `true`       | Whether to display the title in the lightbox.                              |
| `getInfo`      | `.info`      | Selector to fetch the info element.                                        |
| `showInfo`     | `false`      | Whether to display additional info in the lightbox.                        |
| `getPic`       | `a:first`    | Selector to fetch the image source.                                        |
| `fullScreen`   | `true`       | Whether to allow fullscreen mode.                                          |
| `slideTime`    | `5000`       | Time in milliseconds for each slide in slideshow mode.                     |
| `onOpen`       | `null`       | Callback function executed when the lightbox opens.                        |
| `onClose`      | `null`       | Callback function executed when the lightbox closes.                       |
| `onNext`       | `null`       | Callback function executed when navigating to the next item.               |
| `onPrev`       | `null`       | Callback function executed when navigating to the previous item.           |

---

## HTML Structure
Each lightbox item should follow this structure:
```html
<div class="gallery-item">
  <a href="image.jpg">
    <img src="thumbnail.jpg" alt="">
    <div class="title">Image Title</div>
    <div class="info">Additional Information</div>
  </a>
</div>
```

---

## Features
### 1. Fullscreen Mode
Toggles fullscreen display when the `fullscreen` button is clicked or via the `C` keyboard shortcut.

### 2. Slideshow
Automatically navigates through the items at intervals defined by the `slideTime` option. Click the `play` button or press the `Space` key to toggle.

### 3. Image Rotation
Rotates the image in 90-degree increments when the `rotate` button is clicked or the `R` key is pressed.

### 4. Keyboard Navigation
| Key         | Action               |
|-------------|----------------------|
| `ArrowRight`| Navigate to next item|
| `ArrowLeft` | Navigate to prev item|
| `Space`     | Toggle slideshow     |
| `Escape`    | Close lightbox       |
| `R`         | Rotate image         |
| `C`         | Toggle fullscreen    |

---

## API
### Initialize mBox
```javascript
$('.gallery-item').mBox(options);
```
### Callbacks
Callbacks are optional functions executed during specific events:
- **onOpen:**
  ```javascript
  onOpen: function($el, $lightbox) {
    console.log('Lightbox opened:', $el);
  }
  ```
- **onClose:**
  ```javascript
  onClose: function() {
    console.log('Lightbox closed');
  }
  ```
- **onNext:**
  ```javascript
  onNext: function($el) {
    console.log('Next item:', $el);
  }
  ```
- **onPrev:**
  ```javascript
  onPrev: function($el) {
    console.log('Previous item:', $el);
  }
  ```

---

## Internal Methods
### `openLightbox($el, settings)`
Initializes and displays the lightbox for the selected element.

### `closeLightbox($ctr, settings)`
Closes the currently active lightbox.

### `navigateLightbox(direction, _, groupInstances, settings)`
Navigates to the next or previous item in the lightbox group.

### `updateLightboxContent($el, currentIndex, totalCount, settings)`
Updates the lightbox content based on the selected element.

---

## Classes and Attributes
### Attributes
| Attribute       | Description                                      |
|------------------|--------------------------------------------------|
| `mbox-id`       | Unique ID assigned to each element automatically.|
| `mbox-type`     | Specifies the type of content (default: image).  |
| `mbox-full`     | Indicates whether fullscreen is enabled.         |
| `mbox-group`    | Groups items for navigation. Defaults to "ungrouped".|

### Classes
| Class                  | Description                                   |
|------------------------|-----------------------------------------------|
| `mbox-ctr`             | Wrapper for the lightbox container.          |
| `mbox-lightbox`        | Main lightbox element.                       |
| `mbox-content`         | Container for the main content (image).      |
| `mbox-header`          | Contains navigation and control buttons.     |
| `mbox-footer`          | Displays title and info.                     |
| `mbox-prev` / `mbox-next` | Navigation buttons for previous/next items. |
| `mbox-play`            | Button to toggle slideshow mode.             |
| `mbox-rotate`          | Button to rotate the image.                  |
| `mbox-fullscreen`      | Button to toggle fullscreen mode.            |
| `mbox-progress`        | Progress bar for slideshow mode.             |

---

## Notes
1. Ensure all images and titles are properly linked and accessible.
2. Avoid grouping items with the same `mbox-group` attribute if they are not related.
3. Use the `onOpen` and `onClose` callbacks for additional customizations like analytics or logging.

---

## Troubleshooting
### Common Issues
#### Images not displaying
- Ensure the `getPic` selector points to the correct element containing the image.
- Check image paths and verify they are accessible.

#### Lightbox not opening
- Ensure the `mBox` plugin is correctly initialized.
- Verify there are no conflicting scripts or styles.

#### Buttons not functioning
- Verify that the `mbox-ctr` element is present in the DOM.
- Check for JavaScript errors in the console.

For further support, check the repository or raise an issue on GitHub.

---

## License
mBox is licensed under the MIT License. Feel free to use, modify, and distribute as per the license terms.
