/**
 * Boundary & Buffer Zone Protection Utility
 * 
 * Prevents accidental triggering of sidebars, modals, or floating controls
 * when the mouse moves near the top, bottom, or extreme outer edges of the screen
 * (e.g. exiting towards address bar, tabs, taskbar, or browser chrome).
 */

export const DEFAULT_BUFFER_ZONE_PX = 20;

export interface ViewportBoundaryOptions {
  topBuffer?: number;
  bottomBuffer?: number;
  leftBuffer?: number;
  rightBuffer?: number;
}

/**
 * Checks if a mouse or touch event occurred strictly WITHIN the active viewport area,
 * excluding the top/bottom "accidental trigger" buffer zones.
 */
export function isInsideActiveViewport(
  e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent,
  options: ViewportBoundaryOptions = {}
): boolean {
  const topBuffer = options.topBuffer ?? DEFAULT_BUFFER_ZONE_PX;
  const bottomBuffer = options.bottomBuffer ?? DEFAULT_BUFFER_ZONE_PX;
  const leftBuffer = options.leftBuffer ?? 10;
  const rightBuffer = options.rightBuffer ?? 10;

  let clientY = -1;
  let clientX = -1;

  if ('clientY' in e && typeof e.clientY === 'number') {
    clientY = e.clientY;
    clientX = e.clientX;
  } else if ('touches' in e && e.touches && e.touches[0]) {
    clientY = e.touches[0].clientY;
    clientX = e.touches[0].clientX;
  } else if ('changedTouches' in e && e.changedTouches && e.changedTouches[0]) {
    clientY = e.changedTouches[0].clientY;
    clientX = e.changedTouches[0].clientX;
  } else {
    return true; // Safe fallback if position cannot be determined
  }

  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Check top and bottom buffer zones (e.g. top 20px near address bar/tabs, bottom 20px near taskbar)
  if (clientY < topBuffer || clientY > viewportHeight - bottomBuffer) {
    return false;
  }

  // Check left and right outer edge bounds
  if (clientX < leftBuffer || clientX > viewportWidth - rightBuffer) {
    return false;
  }

  return true;
}

/**
 * Checks if the mouse cursor is currently in the "accidental exit" buffer zone
 * (top edge < 20px or bottom edge > innerHeight - 20px).
 */
export function isInEdgeBufferZone(
  e: MouseEvent | React.MouseEvent,
  bufferPx = DEFAULT_BUFFER_ZONE_PX
): boolean {
  if (typeof e.clientY !== 'number') return false;
  const viewportHeight = window.innerHeight;
  return e.clientY < bufferPx || e.clientY > viewportHeight - bufferPx;
}
