# Song Title Overlay Components

This document describes the two song title overlay components that have been added to the camera effect app for music live events.

## Overview

Two components have been created to overlay song title images on top of the CameraCanvas:

1. **SongTitleOverlay** - HTML-based overlay that renders as an HTML element on top of the canvas
2. **SongTitleCanvasOverlay** - Canvas-based overlay that renders inside the existing WebGL canvas at the highest layer

## Components

### 1. SongTitleOverlay (HTML Overlay)

**File:** `src/components/SongTitleOverlay.tsx`

**Features:**
- Renders as an HTML `<img>` element positioned absolutely over the canvas
- Uses CSS transitions for smooth opacity changes
- Higher z-index (1000) to ensure it appears on top
- Responsive design with max-width/max-height constraints

**Props:**
- `songId: number` - Index of the song (0-15, or -1 for no song)
- `isVisible: boolean` - Whether the overlay should be active

**Usage:**
```tsx
<SongTitleOverlay
  songId={currentSongId}
  isVisible={showSongTitle}
/>
```

### 2. SongTitleCanvasOverlay (Canvas Overlay)

**File:** `src/components/SongTitleCanvasOverlay.tsx`

**Features:**
- Renders directly inside the WebGL canvas using custom shaders
- Appears at the highest layer of the canvas rendering
- Uses WebGL textures for optimal performance
- Integrates with the existing canvas rendering pipeline

**Props:**
- `songId: number` - Index of the song (0-15, or -1 for no song)
- `isVisible: boolean` - Whether the overlay should be active
- `canvasRef: React.RefObject<HTMLCanvasElement | null>` - Reference to the canvas element
- `gl: WebGLRenderingContext | null` - WebGL context

**Usage:**
```tsx
<SongTitleCanvasOverlay
  songId={currentSongId}
  isVisible={showSongTitle}
  canvasRef={canvasRef}
  gl={glContext}
/>
```

## Image Cycle Behavior

Both components implement the same timing cycle:
- **Show Duration:** 1 second
- **Hide Duration:** 4 seconds
- **Total Cycle:** 5 seconds
- **Animation:** Smooth opacity transitions

## Available Songs

The following song titles are available (matching the files in `/public/assets/song_title/`):

1. anyway
2. black_nails
3. blueberry_gum
4. darma
5. gtoer_cracker
6. heavens_seven
7. I-hate-u
8. I-wont-let-you-go
9. make_a_move
10. no_colors
11. please
12. sexual_conversation
13. tokyo_sky_blues
14. too_young_to_get_it_too_fast_to_live
15. totsugeki
16. toxic_invasion

## Integration with App.tsx

The components have been integrated into the main app with:

1. **State Management:**
   ```tsx
   const [songId, setSongId] = useState(-1);
   const [showSongTitle, setShowSongTitle] = useState(false);
   ```

2. **CameraCanvas Integration:**
   ```tsx
   <CameraCanvas
     // ... other props
     songId={songId}
     showSongTitle={showSongTitle}
   />
   ```

3. **HTML Overlay:**
   ```tsx
   <SongTitleOverlay
     songId={songId}
     isVisible={showSongTitle}
   />
   ```

## Demo Component

A demo component (`SongTitleDemo`) has been added to test the overlays:

- **Location:** Top-right corner of the screen
- **Features:**
  - Dropdown to select different songs
  - Checkbox to toggle overlay visibility
  - Information about both overlay types
  - Real-time control of overlay behavior

## Technical Details

### HTML Overlay
- Uses CSS positioning and z-index for layering
- Implements smooth opacity transitions
- Handles image loading errors gracefully
- Responsive design that scales with viewport

### Canvas Overlay
- Creates WebGL textures from loaded images
- Uses custom vertex and fragment shaders
- Implements proper WebGL state management
- Clears depth buffer to ensure top-layer rendering
- Handles cleanup of WebGL resources

### Performance Considerations
- Images are loaded on-demand when songId changes
- WebGL textures are properly cleaned up to prevent memory leaks
- Animation frames are cancelled when components unmount
- Both components use efficient state management to minimize re-renders

## Usage Examples

### Basic Usage
```tsx
// Enable overlay for song ID 5 (heavens_seven)
setSongId(5);
setShowSongTitle(true);
```

### Programmatic Control
```tsx
// Change song during performance
const changeSong = (newSongId: number) => {
  setSongId(newSongId);
  // Overlay will automatically cycle: 1s show, 4s hide
};
```

### Disable Overlay
```tsx
// Hide the overlay
setShowSongTitle(false);
// or
setSongId(-1);
```

## File Structure

```
src/
├── components/
│   ├── SongTitleOverlay.tsx          # HTML overlay component
│   ├── SongTitleCanvasOverlay.tsx    # Canvas overlay component
│   └── SongTitleDemo.tsx             # Demo controls
├── App.tsx                           # Main app with integration
└── ...

public/
└── assets/
    └── song_title/                   # Song title images
        ├── anyway.png
        ├── black_nails.png
        ├── ...
        └── toxic_invasion.png
```

## Future Enhancements

Potential improvements for the overlay system:

1. **Custom Timing:** Allow configurable show/hide durations
2. **Multiple Overlays:** Support for multiple song titles simultaneously
3. **Animation Effects:** Add fade, slide, or other transition effects
4. **Audio Sync:** Synchronize overlay timing with audio playback
5. **Custom Positioning:** Allow configurable overlay positions
6. **Responsive Scaling:** Better handling of different screen sizes 