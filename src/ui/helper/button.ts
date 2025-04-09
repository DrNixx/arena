import { redrawSync } from '../../utils/redraw'
import { batchRequestAnimationFrame, removeFromBatchAnimationFrame } from '../../utils/batchRAF'

const HOLD_DURATION = 600
const SCROLL_TOLERANCE_X = 4
const SCROLL_TOLERANCE_Y = 4
const ACTIVE_CLASS = 'active'

interface Boundaries {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface Point {
  x: number
  y: number
}

export default function ButtonHandler(
  el: HTMLElement,
  tapHandler: (e: TouchEvent|MouseEvent) => void,
  holdHandler?: (e: TouchEvent|MouseEvent) => void,
  repeatHandler?: () => boolean,
  scrollX?: boolean,
  scrollY?: boolean,
  getElement?: (e: TouchEvent|MouseEvent) => HTMLElement | null,
  preventEndDefault = true,
) {

  let activeElement: HTMLElement | null = el

  let startX: number,
    startY: number,
    boundaries: Boundaries,
    active: boolean,
    holdTimeoutID: number,
    repeatTimeoutId: number,
    activeTimeoutId: number

  if (typeof tapHandler !== 'function')
    throw new Error('ButtonHandler 2nd argument must be a function!')

  if (holdHandler && typeof holdHandler !== 'function')
    throw new Error('ButtonHandler 3rd argument must be a function!')

  if (repeatHandler && typeof repeatHandler !== 'function')
    throw new Error('ButtonHandler 4rd argument must be a function!')

  // http://ejohn.org/blog/how-javascript-timers-work/
  function onRepeat() {
    const res = repeatHandler!()
    if (res) batchRequestAnimationFrame(onRepeat)
    redrawSync()
  }

  function onPointerStart(e: TouchEvent | MouseEvent) {
    // Получаем координаты в зависимости от типа события
    let clientX: number, clientY: number;
    
    if (e instanceof TouchEvent) {
        const touch = e.changedTouches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
    } else if (e instanceof MouseEvent) {
        // Игнорируем правую кнопку мыши
        if (e.button !== 0) return;
        clientX = e.clientX;
        clientY = e.clientY;
    } else {
        return;
    }

    activeElement = getElement ? getElement(e) : el;
    if (!activeElement) return;
    if ((activeElement as HTMLButtonElement).disabled === true) return;
    
    const boundingRect = activeElement.getBoundingClientRect();
    startX = clientX;
    startY = clientY;
    boundaries = {
        minX: boundingRect.left,
        maxX: boundingRect.right,
        minY: boundingRect.top,
        maxY: boundingRect.bottom
    };
    
    active = true;
    clearTimeout(activeTimeoutId);
    activeElement.classList.add(ACTIVE_CLASS);
    
    holdTimeoutID = setTimeout(() => onHold(e), HOLD_DURATION);
    if (repeatHandler) {
        repeatTimeoutId = setTimeout(() => {
            batchRequestAnimationFrame(onRepeat);
        }, 500);
    }
  }

  function onPointerMove(e: TouchEvent | MouseEvent) {
    // Если не активно или нет активного элемента, выходим
    if (!active || !activeElement) return;

    let clientX: number, clientY: number;

    // Получаем координаты в зависимости от типа события
    if (e instanceof TouchEvent) {
        const touch = e.changedTouches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    // Проверяем, находится ли курсор/палец в пределах элемента
    active = isActive({ x: clientX, y: clientY });

    if (!active) {
        clearTimeout(holdTimeoutID);
        clearTimeout(repeatTimeoutId);
        removeFromBatchAnimationFrame(onRepeat);
        activeElement.classList.remove(ACTIVE_CLASS);
    }
  }

  function onPointerEnd(e: TouchEvent | MouseEvent) {
    // Prevent default if needed (for both touch and mouse events)
    if (e.cancelable && preventEndDefault) e.preventDefault();
    
    // Clean up timeouts and animation frames
    clearTimeout(repeatTimeoutId);
    removeFromBatchAnimationFrame(onRepeat);
    
    if (active && activeElement) {
        clearTimeout(holdTimeoutID);
        
        // Remove active class with small delay (for visual feedback)
        activeTimeoutId = setTimeout(() => {
            if (activeElement) {
                activeElement.classList.remove(ACTIVE_CLASS);
            }
        }, 80);
        
        // Handle the tap/click
        tapHandler(e);
        active = false;
    }
    
    // Additional cleanup for touch events
    if (e instanceof TouchEvent && e.touches.length === 0) {
        active = false;
    }
  }

  function onTouchCancel() {
    clearTimeout(holdTimeoutID)
    clearTimeout(repeatTimeoutId)
    removeFromBatchAnimationFrame(onRepeat)
    active = false
    if (activeElement) {
      activeElement.classList.remove(ACTIVE_CLASS)
    }
  }

  // typescript doesn't like TouchEvent here
  function onContextMenu(e: Event) {
    // just disable it since we handle manually holdHandler
    // because contextmenu does not work in iOS and chrome dev tools
    // (it fires a MouseEvent in the latter)
    e.preventDefault()
    e.stopPropagation()
  }

  function onHold(e: TouchEvent|MouseEvent) {
    if (holdHandler) {
      holdHandler(e)
      active = false
      if (activeElement) {
        activeElement.classList.remove(ACTIVE_CLASS)
      }
    }
  }

  function isActive(point: Point) {
     const x = point.x,
      y = point.y,
      b = boundaries
    let dX = 0,
      dY = 0
    if (scrollX) dX = Math.abs(x - startX)
    if (scrollY) dY = Math.abs(y - startY)
    return (
      x < b.maxX &&
      x > b.minX &&
      y < b.maxY &&
      y > b.minY &&
      dX < SCROLL_TOLERANCE_X &&
      dY < SCROLL_TOLERANCE_Y
    )
  }

  const passiveConf: any = { passive: true }

  if (!('ontouchstart' in window)) {
    el.addEventListener('mousedown', onPointerStart, passiveConf)
    el.addEventListener('mousemove', onPointerMove, passiveConf)
    el.addEventListener('mouseup', onPointerEnd, false)
    el.addEventListener('mouseleave', onTouchCancel, false)
  } else {
    el.addEventListener('touchstart', onPointerStart, passiveConf)
    el.addEventListener('touchmove', onPointerMove, passiveConf)
    el.addEventListener('touchend', onPointerEnd, false)
    el.addEventListener('touchcancel', onTouchCancel, false)
  }

  el.addEventListener('contextmenu', onContextMenu, false)
}

