import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

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

            // ── 2. html2canvas fallback ────────────────────────────────────────
            setIsActive(true);

            // ── Inject spinner keyframes once ──────────────────────────────────
            if (!document.getElementById('eyedrop-spin-style')) {
                const s = document.createElement('style');
                s.id = 'eyedrop-spin-style';
                s.textContent = `@keyframes eyedrop-spin { to { transform: rotate(360deg); } }`;
                document.head.appendChild(s);
            }

            // ── Step 1: Show spinner BEFORE capture starts ─────────────────────
            // We DON'T append this to body yet — we show it AFTER we hide the
            // color picker popup so it isn't captured in the screenshot.
            // Instead we create a separate "blocker" that covers everything
            // during the capture phase, THEN swap to the loupe overlay.
            const blocker = document.createElement('div');
            Object.assign(blocker.style, {
                position:       'fixed',
                inset:          '0',
                // High but NOT max — keeps it above the app but below our overlay
                zIndex:         '999999',
                background:     'rgba(0,0,0,0.0)', // transparent — just blocks mouse
                pointerEvents:  'all',
            });

            // Visible spinner on top of the blocker
            const spinnerWrap = document.createElement('div');
            Object.assign(spinnerWrap.style, {
                position:       'fixed',
                inset:          '0',
                zIndex:         '999999',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexDirection:  'column',
                gap:            '14px',
                pointerEvents:  'none',
            });

            const ring = document.createElement('div');
            Object.assign(ring.style, {
                width:          '48px',
                height:         '48px',
                border:         '5px solid rgba(0,0,0,0.15)',
                borderTopColor: '#09c',
                borderRadius:   '50%',
                animation:      'eyedrop-spin 0.7s linear infinite',
            });

            const spinLabel = document.createElement('div');
            Object.assign(spinLabel.style, {
                background:     'rgba(0,0,0,0.72)',
                color:          '#fff',
                padding:        '6px 18px',
                borderRadius:   '20px',
                fontFamily:     'system-ui, sans-serif',
                fontSize:       '13px',
                fontWeight:     '500',
                letterSpacing:  '0.3px',
            });
            spinLabel.textContent = 'Please Wait…';

            spinnerWrap.appendChild(ring);
            spinnerWrap.appendChild(spinLabel);

            // Append spinner to body — this IS visible to the user
            document.body.appendChild(blocker);
            document.body.appendChild(spinnerWrap);

            // Wait for two animation frames so the spinner actually paints
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            // ── Step 2: Find the target element to capture ─────────────────────
            // We capture the modal-content-editor (the dialog box) only.
            // This avoids the sidebar, navbar, and any other page chrome.
            const modalEl = (
                containerRef?.current?.closest('.modal-content-editor') ||
                containerRef?.current ||
                document.body
            );

            // Hide the spinner from the screenshot — detach temporarily
            document.body.removeChild(spinnerWrap);
            document.body.removeChild(blocker);

            // ── Step 3: Capture the modal element ONLY ─────────────────────────
            let capturedCanvas;
            try {
                capturedCanvas = await html2canvas(modalEl, {
                    useCORS:      true,
                    allowTaint:   false,
                    logging:      false,
                    scale:        window.devicePixelRatio || 1,
                    // Capture the element at its natural size without scroll offsets
                    scrollX:      0,
                    scrollY:      0,
                });
            } catch (err) {
                setIsActive(false);
                reject(err);
                return;
            }

            // ── Step 4: Build overlay ───────────────────────────────────────────
            // The overlay covers the FULL viewport with a solid neutral colour
            // so the sidebar/navbar/grey areas are completely hidden.
            // Over that, the captured modal screenshot is positioned exactly
            // where the modal sits on screen.
            const modalRect = modalEl.getBoundingClientRect();
            const dpr       = window.devicePixelRatio || 1;
            const canvasW   = capturedCanvas.width;
            const canvasH   = capturedCanvas.height;
            const ctx       = capturedCanvas.getContext('2d');

            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position:        'fixed',
                inset:           '0',
                zIndex:          '2147483647',
                cursor:          'crosshair',
                // Solid page background fills entire viewport — no bleed-through
                backgroundColor: '#f0f0f0',
                // The captured modal screenshot sits exactly where the modal was
                backgroundImage:    `url(${capturedCanvas.toDataURL()})`,
                backgroundRepeat:   'no-repeat',
                backgroundPosition: `${modalRect.left}px ${modalRect.top}px`,
                backgroundSize:     `${modalRect.width}px ${modalRect.height}px`,
            });

            // ── Loupe constants ──
            const LOUPE_D     = 140;
            const LOUPE_R     = LOUPE_D / 2;
            const ZOOM        = 8;
            const LOUPE_ABOVE = LOUPE_D + 24;

            // ── Loupe canvas ──
            const loupeCanvas = document.createElement('canvas');
            loupeCanvas.width  = LOUPE_D;
            loupeCanvas.height = LOUPE_D;
            Object.assign(loupeCanvas.style, {
                position:       'fixed',
                width:          `${LOUPE_D}px`,
                height:         `${LOUPE_D}px`,
                borderRadius:   '50%',
                border:         '3px solid white',
                boxShadow:      '0 0 0 2px rgba(0,0,0,0.4), 0 8px 30px rgba(0,0,0,0.4)',
                pointerEvents:  'none',
                display:        'none',
                zIndex:         '2147483647',
                imageRendering: 'pixelated',
            });
            const loupeCtx = loupeCanvas.getContext('2d');

            // ── Hex label ──
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

            // ── Sample a pixel ─────────────────────────────────────────────────
            // Map viewport coords → canvas coords via the modal's bounding rect
            const samplePixel = (viewportX, viewportY) => {
                const cx = Math.round((viewportX - modalRect.left) * dpr);
                const cy = Math.round((viewportY - modalRect.top)  * dpr);
                const sx = Math.max(0, Math.min(canvasW - 1, cx));
                const sy = Math.max(0, Math.min(canvasH - 1, cy));
                try {
                    const px = ctx.getImageData(sx, sy, 1, 1).data;
                    return { r: px[0], g: px[1], b: px[2] };
                } catch (_) {
                    return { r: 240, g: 240, b: 240 };
                }
            };

            // ── Draw loupe ──
            const drawLoupe = (viewportX, viewportY) => {
                const cx   = (viewportX - modalRect.left) * dpr;
                const cy   = (viewportY - modalRect.top)  * dpr;
                const half = (LOUPE_D / ZOOM) / 2;

                loupeCtx.clearRect(0, 0, LOUPE_D, LOUPE_D);
                loupeCtx.save();
                loupeCtx.beginPath();
                loupeCtx.arc(LOUPE_R, LOUPE_R, LOUPE_R, 0, Math.PI * 2);
                loupeCtx.clip();

                loupeCtx.drawImage(
                    capturedCanvas,
                    cx - half, cy - half,
                    half * 2,  half * 2,
                    0, 0,
                    LOUPE_D, LOUPE_D,
                );

                const cellSize = LOUPE_D / (half * 2);

                loupeCtx.strokeStyle = 'rgba(0,0,0,0.08)';
                loupeCtx.lineWidth   = 1;
                for (let gx = 0; gx < LOUPE_D; gx += cellSize) {
                    loupeCtx.beginPath(); loupeCtx.moveTo(gx, 0); loupeCtx.lineTo(gx, LOUPE_D); loupeCtx.stroke();
                }
                for (let gy = 0; gy < LOUPE_D; gy += cellSize) {
                    loupeCtx.beginPath(); loupeCtx.moveTo(0, gy); loupeCtx.lineTo(LOUPE_D, gy); loupeCtx.stroke();
                }

                loupeCtx.strokeStyle = 'rgba(255,255,255,0.9)';
                loupeCtx.lineWidth   = 1;
                loupeCtx.beginPath();
                loupeCtx.moveTo(LOUPE_R, 0);  loupeCtx.lineTo(LOUPE_R, LOUPE_D);
                loupeCtx.moveTo(0, LOUPE_R);  loupeCtx.lineTo(LOUPE_D, LOUPE_R);
                loupeCtx.stroke();

                loupeCtx.strokeStyle = 'rgba(255,255,255,1)';
                loupeCtx.lineWidth   = 1.5;
                loupeCtx.strokeRect(LOUPE_R - cellSize / 2, LOUPE_R - cellSize / 2, cellSize, cellSize);

                loupeCtx.restore();
            };

            // ── Position loupe ──
            const positionLoupe = (mx, my) => {
                let topPos = my - LOUPE_ABOVE;
                if (topPos < 8) topPos = my + 24;

                let leftPos = mx - LOUPE_R;
                if (leftPos < 8) leftPos = 8;
                if (leftPos + LOUPE_D > window.innerWidth - 8)
                    leftPos = window.innerWidth - LOUPE_D - 8;

                loupeCanvas.style.left = `${leftPos}px`;
                loupeCanvas.style.top  = `${topPos}px`;

                hexLabel.style.left = `${mx}px`;
                hexLabel.style.top  = `${topPos + LOUPE_D + 6}px`;
                if (topPos > my) hexLabel.style.top = `${my - 28}px`;
            };

            // ── Mouse move ──
            const onMove = (e) => {
                loupeCanvas.style.display = 'block';
                hexLabel.style.display    = 'block';
                drawLoupe(e.clientX, e.clientY);
                positionLoupe(e.clientX, e.clientY);
                const { r, g, b } = samplePixel(e.clientX, e.clientY);
                const hex = rgbToHex(r, g, b);
                loupeCanvas.style.borderColor = hex;
                hexLabel.textContent           = hex.toUpperCase();
                hexLabel.style.background      = hex;
                const lum = r * 0.299 + g * 0.587 + b * 0.114;
                hexLabel.style.color = lum > 140 ? '#000' : '#fff';
            };

            // ── Click ──
            const onClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const { r, g, b } = samplePixel(e.clientX, e.clientY);
                cleanup();
                resolve({ hex: rgbToHex(r, g, b), r, g, b });
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