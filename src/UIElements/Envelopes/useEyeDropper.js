import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';

// ── helpers ───────────────────────────────────────────────────────────────────

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// ── main hook ─────────────────────────────────────────────────────────────────

/**
 * useEyeDropper
 *
 * Chrome / Edge  → native window.EyeDropper API (zero deps)
 * Firefox / Safari → html2canvas captures the target element to a canvas,
 *                    then a loupe lets the user click any pixel.
 *
 * Usage:
 *   const { pickColor, isActive } = useEyeDropper();
 *   const result = await pickColor(containerRef);
 *   // result → { hex: '#rrggbb', r, g, b }
 *
 * Install:  npm install html2canvas
 */
export function useEyeDropper() {
    const [isActive, setIsActive] = useState(false);

    const pickColor = useCallback((containerRef) => {
        return new Promise(async (resolve, reject) => {

            // ── 1. Native EyeDropper (Chrome / Edge) ──────────────────────────
            if ('EyeDropper' in window) {
                const ed = new window.EyeDropper();
                setIsActive(true);
                try {
                    const result = await ed.open();
                    setIsActive(false);
                    const hex = result.sRGBHex.toLowerCase();
                    resolve({
                        hex,
                        r: parseInt(hex.slice(1, 3), 16),
                        g: parseInt(hex.slice(3, 5), 16),
                        b: parseInt(hex.slice(5, 7), 16),
                    });
                } catch (e) {
                    setIsActive(false);
                    reject(e);
                }
                return;
            }

            // ── 2. html2canvas fallback (Firefox / Safari) ────────────────────
            setIsActive(true);

            // The element we'll capture — prefer the editor modal so the user
            // can pick colors from anywhere visible, fall back to document.body
            const targetEl = (
                containerRef?.current?.closest('.modal-content-editor') ||
                containerRef?.current ||
                document.body
            );

            // Show a brief "capturing…" toast so the user knows something is happening
            const loadingBadge = document.createElement('div');
            Object.assign(loadingBadge.style, {
                position:     'fixed',
                bottom:       '24px',
                left:         '50%',
                transform:    'translateX(-50%)',
                background:   'rgba(0,0,0,0.75)',
                color:        'white',
                padding:      '8px 20px',
                borderRadius: '20px',
                fontSize:     '13px',
                fontFamily:   'system-ui, sans-serif',
                zIndex:       '2147483646',
                pointerEvents:'none',
                whiteSpace:   'nowrap',
            });
            loadingBadge.textContent = '📸 Capturing editor…';
            document.body.appendChild(loadingBadge);

            let capturedCanvas;
            try {
                capturedCanvas = await html2canvas(targetEl, {
                    useCORS:       true,
                    allowTaint:    true,
                    logging:       false,
                    scale:         window.devicePixelRatio || 1,
                    // Don't scroll — capture exactly what's visible
                    scrollX:       -window.scrollX,
                    scrollY:       -window.scrollY,
                    windowWidth:   document.documentElement.scrollWidth,
                    windowHeight:  document.documentElement.scrollHeight,
                });
            } catch (err) {
                if (loadingBadge.parentNode) loadingBadge.parentNode.removeChild(loadingBadge);
                setIsActive(false);
                reject(err);
                return;
            }

            if (loadingBadge.parentNode) loadingBadge.parentNode.removeChild(loadingBadge);

            const dpr      = window.devicePixelRatio || 1;
            const rect     = targetEl.getBoundingClientRect();
            const canvasW  = capturedCanvas.width;
            const canvasH  = capturedCanvas.height;
            const ctx      = capturedCanvas.getContext('2d');

            // ── Loupe constants ──
            const LOUPE_D  = 140;
            const LOUPE_R  = LOUPE_D / 2;
            const ZOOM     = 8;
            const LOUPE_ABOVE = LOUPE_D + 24;

            // ── Full-screen overlay — shows the frozen capture as background ──
            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position:   'fixed',
                inset:      '0',
                zIndex:     '2147483647',
                cursor:     'crosshair',
                // Render the captured canvas as a CSS background image
                // positioned exactly where the target element is on screen
                backgroundImage:    `url(${capturedCanvas.toDataURL()})`,
                backgroundRepeat:   'no-repeat',
                backgroundPosition: `${rect.left}px ${rect.top}px`,
                backgroundSize:     `${rect.width}px ${rect.height}px`,
                // Dim everything outside the captured area
                backgroundColor:    'rgba(0,0,0,0.4)',
            });

            // ── Loupe canvas (magnifier circle) ──
            const loupeCanvas = document.createElement('canvas');
            loupeCanvas.width  = LOUPE_D;
            loupeCanvas.height = LOUPE_D;
            Object.assign(loupeCanvas.style, {
                position:      'fixed',
                width:         `${LOUPE_D}px`,
                height:        `${LOUPE_D}px`,
                borderRadius:  '50%',
                border:        '3px solid white',
                boxShadow:     '0 0 0 2px rgba(0,0,0,0.4), 0 8px 30px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
                display:       'none',
                zIndex:        '2147483647',
                imageRendering:'pixelated',
            });
            const loupeCtx = loupeCanvas.getContext('2d');

            // ── Color hex label (below loupe) ──
            const hexLabel = document.createElement('div');
            Object.assign(hexLabel.style, {
                position:      'fixed',
                background:    'rgba(0,0,0,0.75)',
                color:         'white',
                padding:       '3px 10px',
                borderRadius:  '10px',
                fontSize:      '11px',
                fontFamily:    'monospace',
                letterSpacing: '1px',
                pointerEvents: 'none',
                display:       'none',
                zIndex:        '2147483647',
                whiteSpace:    'nowrap',
                transform:     'translateX(-50%)',
            });

            // ── Hint bar ──
            const hint = document.createElement('div');
            Object.assign(hint.style, {
                position:      'fixed',
                bottom:        '24px',
                left:          '50%',
                transform:     'translateX(-50%)',
                background:    'rgba(0,0,0,0.72)',
                color:         'white',
                padding:       '7px 20px',
                borderRadius:  '20px',
                fontSize:      '13px',
                fontFamily:    'system-ui, sans-serif',
                pointerEvents: 'none',
                userSelect:    'none',
                letterSpacing: '0.2px',
                zIndex:        '2147483647',
                whiteSpace:    'nowrap',
            });
            hint.textContent = 'Click to pick a color  •  Esc to cancel';

            document.body.appendChild(overlay);
            document.body.appendChild(loupeCanvas);
            document.body.appendChild(hexLabel);
            document.body.appendChild(hint);

            // ── Helper: sample a pixel from the captured canvas ──
            const samplePixel = (viewportX, viewportY) => {
                // Map viewport coords → captured canvas coords
                const cx = Math.round((viewportX - rect.left) * dpr);
                const cy = Math.round((viewportY - rect.top)  * dpr);

                // Clamp to canvas bounds
                const sx = Math.max(0, Math.min(canvasW - 1, cx));
                const sy = Math.max(0, Math.min(canvasH - 1, cy));

                try {
                    const px = ctx.getImageData(sx, sy, 1, 1).data;
                    return { r: px[0], g: px[1], b: px[2] };
                } catch (_) {
                    return { r: 255, g: 255, b: 255 };
                }
            };

            // ── Draw the loupe ──
            const drawLoupe = (viewportX, viewportY) => {
                // The region on the captured canvas we zoom into
                const cx    = (viewportX - rect.left) * dpr;
                const cy    = (viewportY - rect.top)  * dpr;
                const half  = (LOUPE_D / ZOOM) / 2; // source half-width in canvas px

                loupeCtx.clearRect(0, 0, LOUPE_D, LOUPE_D);

                // Clip to circle
                loupeCtx.save();
                loupeCtx.beginPath();
                loupeCtx.arc(LOUPE_R, LOUPE_R, LOUPE_R, 0, Math.PI * 2);
                loupeCtx.clip();

                // Draw zoomed slice of the captured canvas
                loupeCtx.drawImage(
                    capturedCanvas,
                    cx - half, cy - half,   // source x, y
                    half * 2,  half * 2,    // source w, h
                    0, 0,                   // dest x, y
                    LOUPE_D, LOUPE_D,       // dest w, h
                );

                // Pixel grid lines (subtle)
                loupeCtx.strokeStyle = 'rgba(0,0,0,0.08)';
                loupeCtx.lineWidth   = 1;
                const cellSize = LOUPE_D / (half * 2);
                for (let gx = 0; gx < LOUPE_D; gx += cellSize) {
                    loupeCtx.beginPath();
                    loupeCtx.moveTo(gx, 0);
                    loupeCtx.lineTo(gx, LOUPE_D);
                    loupeCtx.stroke();
                }
                for (let gy = 0; gy < LOUPE_D; gy += cellSize) {
                    loupeCtx.beginPath();
                    loupeCtx.moveTo(0, gy);
                    loupeCtx.lineTo(LOUPE_D, gy);
                    loupeCtx.stroke();
                }

                // Crosshair
                loupeCtx.strokeStyle = 'rgba(255,255,255,0.9)';
                loupeCtx.lineWidth   = 1;
                loupeCtx.beginPath();
                loupeCtx.moveTo(LOUPE_R, 0);
                loupeCtx.lineTo(LOUPE_R, LOUPE_D);
                loupeCtx.moveTo(0, LOUPE_R);
                loupeCtx.lineTo(LOUPE_D, LOUPE_R);
                loupeCtx.stroke();

                // Center pixel highlight box
                const boxSize = cellSize;
                loupeCtx.strokeStyle = 'rgba(255,255,255,1)';
                loupeCtx.lineWidth   = 1.5;
                loupeCtx.strokeRect(
                    LOUPE_R - boxSize / 2,
                    LOUPE_R - boxSize / 2,
                    boxSize, boxSize,
                );

                loupeCtx.restore();
            };

            // ── Position loupe and label relative to cursor ──
            const positionLoupe = (mx, my) => {
                // Float above cursor, flip below if too close to top
                let topPos = my - LOUPE_ABOVE;
                if (topPos < 8) topPos = my + 24;

                // Keep horizontally within viewport
                let leftPos = mx - LOUPE_R;
                if (leftPos < 8) leftPos = 8;
                if (leftPos + LOUPE_D > window.innerWidth - 8)
                    leftPos = window.innerWidth - LOUPE_D - 8;

                loupeCanvas.style.left = `${leftPos}px`;
                loupeCanvas.style.top  = `${topPos}px`;

                // Label sits just below the loupe
                hexLabel.style.left = `${mx}px`;
                hexLabel.style.top  = `${topPos + LOUPE_D + 6}px`;
                if (topPos > my) {
                    // loupe was flipped below — put label above cursor
                    hexLabel.style.top = `${my - 28}px`;
                }
            };

            // ── Mouse move ──
            const onMove = (e) => {
                const mx = e.clientX;
                const my = e.clientY;

                loupeCanvas.style.display = 'block';
                hexLabel.style.display    = 'block';

                drawLoupe(mx, my);
                positionLoupe(mx, my);

                const { r, g, b } = samplePixel(mx, my);
                const hex = rgbToHex(r, g, b);

                loupeCanvas.style.borderColor = hex;
                hexLabel.textContent           = hex.toUpperCase();
                hexLabel.style.background      = hex;
                // Keep label text readable regardless of background
                const lum = r * 0.299 + g * 0.587 + b * 0.114;
                hexLabel.style.color = lum > 140 ? '#000' : '#fff';
            };

            // ── Click — resolve with pixel color ──
            const onClick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const { r, g, b } = samplePixel(e.clientX, e.clientY);
                const hex = rgbToHex(r, g, b);

                cleanup();
                resolve({ hex, r, g, b });
            };

            // ── Escape ──
            const onKeyDown = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    reject(new Error('EyeDropper cancelled'));
                }
            };

            // ── Cleanup ──
            const cleanup = () => {
                overlay.removeEventListener('mousemove', onMove);
                overlay.removeEventListener('click',     onClick);
                window.removeEventListener('keydown',    onKeyDown);
                [overlay, loupeCanvas, hexLabel, hint].forEach(el => {
                    if (el.parentNode) el.parentNode.removeChild(el);
                });
                setIsActive(false);
            };

            overlay.addEventListener('mousemove', onMove);
            overlay.addEventListener('click',     onClick);
            window.addEventListener('keydown',    onKeyDown);
        });
    }, []);

    return { pickColor, isActive };
}