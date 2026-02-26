import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CgColorPicker } from 'react-icons/cg';

// ─── Color Helpers ────────────────────────────────────────────────────────────

function hsvToRgb(h, s, v) {
    const f = (n) => {
        const k = (n + h / 60) % 6;
        return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
    if (!hex) return null;
    // Handle rgb(...) format from computedStyle
    const rgbMatch = hex.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (rgbMatch) return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return null;
    const n = parseInt(clean, 16);
    if (isNaN(n)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (d !== 0) {
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
            default: break;
        }
    }
    return [h * 360, s, v];
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ─── Built-in Preset Colors ───────────────────────────────────────────────────
const PRESET_ROWS = [
    ['#f44336', '#e91e63', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0', '#ffffff'],
    ['#ff5722', '#009688', '#00bcd4', '#8bc34a', '#795548', '#607d8b', '#000000'],
];


// ─── Component ────────────────────────────────────────────────────────────────

const CustomColorPicker = ({ color = '#ff0000', onChange, onApply, width = 252 }) => {
    const initFromHex = (hex) => {
        const rgb = hexToRgb(hex || '#ff0000');
        if (!rgb) return { hsv: [0, 1, 1], rgb: [255, 0, 0] };
        return { hsv: rgbToHsv(...rgb), rgb };
    };
    const PADDING = 20;
    const CANVAS_W = width - PADDING;
    const CANVAS_H = Math.round(CANVAS_W * (150 / 220));
    const BAR_W = CANVAS_W;
    const BAR_H = 12;

    const init = initFromHex(color);

    const [hue, setHue] = useState(init.hsv[0]);
    const [sat, setSat] = useState(init.hsv[1]);
    const [val, setVal] = useState(init.hsv[2]);
    const [alpha, setAlpha] = useState(100);

    const [hexInput, setHexInput] = useState(() => {
        const rgb = hexToRgb(color || '#ff0000');
        if (!rgb) return 'FF0000';
        return rgbToHex(...rgb).replace('#', '').toUpperCase();
    });
    const [rInput, setRInput] = useState(String(init.rgb[0]));
    const [gInput, setGInput] = useState(String(init.rgb[1]));
    const [bInput, setBInput] = useState(String(init.rgb[2]));
    const [aInput, setAInput] = useState('100');

    const svRef = useRef(null);
    const hueRef = useRef(null);
    const alphaRef = useRef(null);
    const dragging = useRef(null);
    const dragPending = useRef(null);
    const isUserTypingHex = useRef(false);
    const rInputRef = useRef(null);
    const gInputRef = useRef(null);
    const bInputRef = useRef(null);
    const aInputRef = useRef(null);

    useEffect(() => {
        if (isUserTypingHex.current) return;
        const { hsv, rgb } = initFromHex(color);
        const currentHex = rgbToHex(...hsvToRgb(hue, sat, val)).toLowerCase();
        const incomingHex = (hexToRgb(color) ? rgbToHex(...hexToRgb(color)) : '').toLowerCase();
        if (currentHex === incomingHex) return;
        setHue(hsv[0]); setSat(hsv[1]); setVal(hsv[2]);
        setHexInput((color || '').replace('#', '').toUpperCase());
        setRInput(String(rgb[0])); setGInput(String(rgb[1])); setBInput(String(rgb[2]));
    }, [color]); // eslint-disable-line

    const getCurrentHex = useCallback(() => {
        const [r, g, b] = hsvToRgb(hue, sat, val);
        return rgbToHex(r, g, b);
    }, [hue, sat, val]);

    const currentRgb = useCallback(() => hsvToRgb(hue, sat, val), [hue, sat, val]);

    const fireChangeVisual = useCallback((h, s, v, a) => {
        const [r, g, b] = hsvToRgb(h, s, v);
        const hex = rgbToHex(r, g, b);
        const alphaHex = a < 100 ? Math.round((a / 100) * 255).toString(16).padStart(2, '0').toUpperCase() : '';
        setHexInput(hex.replace('#', '').toUpperCase() + alphaHex);
        setRInput(String(r)); setGInput(String(g)); setBInput(String(b));
        setAInput(String(Math.round(a)));
    }, []);

    const fireChange = useCallback((h, s, v, a) => {
        const [r, g, b] = hsvToRgb(h, s, v);
        const hex = rgbToHex(r, g, b);
        const alphaHex = a < 100 ? Math.round((a / 100) * 255).toString(16).padStart(2, '0').toUpperCase() : '';
        setHexInput(hex.replace('#', '').toUpperCase() + alphaHex);
        setRInput(String(r)); setGInput(String(g)); setBInput(String(b));
        setAInput(String(Math.round(a)));
        onChange && onChange({ hex, rgb: { r, g, b, a: a / 100 } });
    }, [onChange]);

    // ── Canvas draws ──
    useEffect(() => {
        const canvas = svRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const [hr, hg, hb] = hsvToRgb(hue, 1, 1);
        const hg2 = ctx.createLinearGradient(0, 0, W, 0);
        hg2.addColorStop(0, '#fff');
        hg2.addColorStop(1, `rgb(${hr},${hg},${hb})`);
        ctx.fillStyle = hg2; ctx.fillRect(0, 0, W, H);
        const vg = ctx.createLinearGradient(0, 0, 0, H);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, '#000');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }, [hue]);

    useEffect(() => {
        const canvas = hueRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        for (let i = 0; i <= 6; i++) {
            const [r, g, b] = hsvToRgb(i * 60, 1, 1);
            grad.addColorStop(i / 6, `rgb(${r},${g},${b})`);
        }
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    }, []);

    useEffect(() => {
        const canvas = alphaRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const sz = 5;
        for (let x = 0; x < W; x += sz)
            for (let y = 0; y < H; y += sz) {
                ctx.fillStyle = ((Math.floor(x / sz) + Math.floor(y / sz)) % 2 === 0) ? '#ccc' : '#fff';
                ctx.fillRect(x, y, sz, sz);
            }
        const [r, g, b] = currentRgb();
        const ag = ctx.createLinearGradient(0, 0, W, 0);
        ag.addColorStop(0, `rgba(${r},${g},${b},0)`);
        ag.addColorStop(1, `rgba(${r},${g},${b},1)`);
        ctx.fillStyle = ag; ctx.fillRect(0, 0, W, H);
    }, [hue, sat, val, currentRgb]);

    // ── Pointer helpers ──
    const pctX = (e, el) => {
        const rect = el.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        return clamp((cx - rect.left) / rect.width, 0, 1);
    };
    const pctXY = (e, el) => {
        const rect = el.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return [clamp((cx - rect.left) / rect.width, 0, 1), clamp((cy - rect.top) / rect.height, 0, 1)];
    };

    const onSVDown = (e) => {
        e.preventDefault(); dragging.current = 'sv';
        const [sx, sy] = pctXY(e, svRef.current);
        setSat(sx); setVal(1 - sy);
        dragPending.current = { h: hue, s: sx, v: 1 - sy, a: alpha };
        fireChangeVisual(hue, sx, 1 - sy, alpha);
    };
    const onHueDown = (e) => {
        e.preventDefault(); dragging.current = 'hue';
        const nh = pctX(e, hueRef.current) * 360;
        setHue(nh);
        dragPending.current = { h: nh, s: sat, v: val, a: alpha };
        fireChangeVisual(nh, sat, val, alpha);
    };
    const onAlphaDown = (e) => {
        e.preventDefault(); dragging.current = 'alpha';
        const na = Math.round(pctX(e, alphaRef.current) * 100);
        setAlpha(na); setAInput(String(na));
        dragPending.current = { h: hue, s: sat, v: val, a: na };
        fireChangeVisual(hue, sat, val, na);
    };

    useEffect(() => {
        const onMove = (e) => {
            if (!dragging.current) return;
            e.preventDefault();
            if (dragging.current === 'sv') {
                const [sx, sy] = pctXY(e, svRef.current);
                setSat(sx); setVal(1 - sy);
                dragPending.current = { h: hue, s: sx, v: 1 - sy, a: alpha };
                fireChangeVisual(hue, sx, 1 - sy, alpha);
            } else if (dragging.current === 'hue') {
                const nh = pctX(e, hueRef.current) * 360;
                setHue(nh);
                dragPending.current = { h: nh, s: sat, v: val, a: alpha };
                fireChangeVisual(nh, sat, val, alpha);
            } else if (dragging.current === 'alpha') {
                const na = Math.round(pctX(e, alphaRef.current) * 100);
                setAlpha(na); setAInput(String(na));
                dragPending.current = { h: hue, s: sat, v: val, a: na };
                fireChangeVisual(hue, sat, val, na);
            }
        };

        const onUp = () => {
            if (dragging.current && dragPending.current) {
                const { h, s, v, a } = dragPending.current;
                fireChange(h, s, v, a);
                dragPending.current = null;
            }
            dragging.current = null;
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };
    }, [hue, sat, val, alpha, fireChange, fireChangeVisual]);

    // ── Hex input — only VISUAL update while typing, apply on blur or Enter ──
    const onHexChange = (e) => {
        isUserTypingHex.current = true;
        try {
            let raw = e.target.value;
            raw = raw.replace(/^#+/, '').trim();
            raw = raw.replace(/[^0-9a-fA-F]/g, '');
            raw = raw.slice(0, 8);
            const upper = raw.toUpperCase();
            setHexInput(upper);

            // Only update the picker visuals (sliders/preview) — do NOT call onChange yet
            let normalized = upper;
            if (normalized.length === 3) {
                normalized = normalized.split('').map(c => c + c).join('');
            }
            if ([3, 6, 8].includes(raw.length)) {
                const hex6 = '#' + normalized.slice(0, 6);
                const rgb = hexToRgb(hex6);
                const hsv = rgb ? rgbToHsv(...rgb) : null;
                if (hsv && rgb) {
                    // Just update the picker UI state — don't fire onChange
                    setHue(hsv[0]); setSat(hsv[1]); setVal(hsv[2]);
                    setRInput(String(rgb[0])); setGInput(String(rgb[1])); setBInput(String(rgb[2]));
                    if (raw.length === 8) {
                        const a8 = Math.round((parseInt(normalized.slice(6, 8), 16) / 255) * 100);
                        setAlpha(a8); setAInput(String(a8));
                    }
                }
            }
        } catch (_) { }
    };

    // ── Apply hex color only when user finishes typing (blur or Enter) ──
    const applyHexColor = (directValue) => {
        const rawInput = directValue || hexInput; // use DOM value if passed
        isUserTypingHex.current = false;
        try {
            let raw = hexInput.replace(/^#+/, '').trim();
            let normalized = raw;
            if (normalized.length === 3) {
                normalized = normalized.split('').map(c => c + c).join('');
            }
            if ([3, 6, 8].includes(raw.length)) {
                const hex6 = '#' + normalized.slice(0, 6);
                const rgb = hexToRgb(hex6);
                if (rgb) {
                    const a = raw.length === 8
                        ? Math.round((parseInt(normalized.slice(6, 8), 16) / 255) * 100)
                        : alpha;
                    onChange && onChange({ hex: hex6, rgb: { r: rgb[0], g: rgb[1], b: rgb[2], a: a / 100 } });
                }
            }
        } catch (_) { }
    };

    const onHexKeyDown = (e) => {
        if (e.key === 'Enter' || e.code === 'NumpadEnter') {
            e.preventDefault();
            e.stopPropagation();
            applyHexColor(e.currentTarget.value);
            onChange && onChange({ hex: getCurrentHex(), rgb: { r, g, b, a: alpha / 100 } }, true);
            onApply && onApply();
        }
    };

    const onChannelKeyDown = (e, ch) => {
        // Allow: digits, backspace, delete, tab, arrow keys only
        const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'];
        if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
            e.preventDefault();
        }

        if (e.key === 'Enter' || e.code === 'NumpadEnter') {
            e.preventDefault();
            e.stopPropagation();
            if (ch === 'r') gInputRef.current?.focus();
            else if (ch === 'g') bInputRef.current?.focus();
            else if (ch === 'b') aInputRef.current?.focus();
            else if (ch === 'a') {
                onChange && onChange({ hex: getCurrentHex(), rgb: { r, g, b, a: alpha / 100 } }, true);
                onApply && onApply();
            }
        }
    };

    const onHexBlur = () => {
        applyHexColor();
    };

    const onChannelChange = (ch, raw) => {
        try {
            if (ch === 'r') setRInput(raw);
            else if (ch === 'g') setGInput(raw);
            else if (ch === 'b') setBInput(raw);
            else if (ch === 'a') setAInput(raw);

            const n = parseInt(raw, 10);
            if (isNaN(n)) return;

            const clamped = clamp(n, 0, ch === 'a' ? 100 : 255);
            if (ch === 'a') { setAlpha(clamped); fireChange(hue, sat, val, clamped); return; }

            let r = parseInt(rInput) || 0;
            let g = parseInt(gInput) || 0;
            let b = parseInt(bInput) || 0;
            if (ch === 'r') r = clamped;
            else if (ch === 'g') g = clamped;
            else if (ch === 'b') b = clamped;

            const hsv = rgbToHsv(r, g, b);
            setHue(hsv[0]); setSat(hsv[1]); setVal(hsv[2]);
            setHexInput(rgbToHex(r, g, b).replace('#', '').toUpperCase());
            onChange && onChange({ hex: rgbToHex(r, g, b), rgb: { r, g, b, a: alpha / 100 } });
        } catch (_) { }
    };

    const onPresetClick = (p) => {
        const rgb = hexToRgb(p);
        const hsv = rgb ? rgbToHsv(...rgb) : null;
        if (!hsv || !rgb) return;
        setHue(hsv[0]); setSat(hsv[1]); setVal(hsv[2]);
        setHexInput(p.replace('#', '').toUpperCase());
        setRInput(String(rgb[0])); setGInput(String(rgb[1])); setBInput(String(rgb[2]));
        fireChange(hsv[0], hsv[1], hsv[2], alpha);
    };

    const svX = sat * CANVAS_W;
    const svY = (1 - val) * CANVAS_H;
    const hueX = clamp((hue / 360) * BAR_W, 0, BAR_W);
    const alphaX = clamp((alpha / 100) * BAR_W, 0, BAR_W);
    const [r, g, b] = currentRgb();
    const hexNow = getCurrentHex();
    const [phr, phg, phb] = hsvToRgb(hue, 1, 1);

    const S = {
        barWrap: {
            position: 'relative',
            width: BAR_W,
            height: BAR_H,
            borderRadius: BAR_H / 4,

            cursor: 'ew-resize',
            marginBottom: '6px',
        },
        thumb: (x, bg) => ({
            position: 'absolute',
            left: x,
            top: '50%',
            width: 10, height: 16,
            borderRadius: '20%',
            border: '2px solid white',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
            background: bg,
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
            boxSizing: 'border-box',
        }),
        inputField: {
            border: '1px solid #ccc',
            borderRadius: '2px',
            outline: 'none',
            background: '#fafafa',
            fontSize: '11px',
            textAlign: 'center',
            padding: '3px 2px',
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif',
        },
        swatch: (p, isActive) => ({
            width: '100%',
            height: '18px',
            background: p,
            borderRadius: '2px',
            cursor: 'pointer',
            border: isActive ? '2px solid #333' : '1px solid rgba(0,0,0,0.15)',
            boxSizing: 'border-box',
            flexShrink: 0,
        }),
    };

    return (
        <div
            style={{
                width: `${width}px`,
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                padding: '10px 10px 8px 10px',
                userSelect: 'none',
                fontFamily: 'Arial, sans-serif',
                fontSize: '11px',
                color: '#333',
                boxSizing: 'border-box',
            }}
        // ── CRITICAL: Do NOT call preventDefault here globally ──
        // If we preventDefault on all mousedown, clicking inside inputs
        // would prevent the input from getting focus.
        // Instead we only prevent default on the canvas/slider areas.
        >
            {/* SV Canvas */}
            <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H, borderRadius: '2px', overflow: 'hidden', cursor: 'crosshair', marginBottom: '8px' }}
                onMouseDown={onSVDown} onTouchStart={onSVDown}>
                <canvas ref={svRef} width={CANVAS_W} height={CANVAS_H} style={{ display: 'block', width: CANVAS_W, height: CANVAS_H }} />
                <div style={{ position: 'absolute', left: svX, top: svY, width: 10, height: 10, borderRadius: '5%', border: '2px solid white', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)', transform: 'translate(-50%,-50%)', pointerEvents: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Hue Bar */}
            <div style={S.barWrap} onMouseDown={onHueDown} onTouchStart={onHueDown}>
                <canvas ref={hueRef} width={BAR_W} height={BAR_H} style={{ display: 'block', width: BAR_W, height: BAR_H }} />
                <div style={S.thumb(hueX, `rgb(${phr},${phg},${phb})`)} />
            </div>

            {/* Alpha Bar */}
            <div style={S.barWrap} onMouseDown={onAlphaDown} onTouchStart={onAlphaDown}>
                <canvas ref={alphaRef} width={BAR_W} height={BAR_H} style={{ display: 'block', width: BAR_W, height: BAR_H }} />
                <div style={S.thumb(alphaX, `rgba(${r},${g},${b},${alpha / 100})`)} />
            </div>

            {/* Preview + Inputs */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                    <div
                        style={{ width: 36, height: 36, flexShrink: 0, borderRadius: '3px', border: '1px solid #ccc', background: `rgba(${r},${g},${b},${alpha / 100})`, marginTop: '2px', cursor: 'pointer' }}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onChange && onChange({ hex: getCurrentHex(), rgb: { r, g, b, a: alpha / 100 } }, true);
                            onApply && onApply();
                        }}
                    />
                    <CgColorPicker
                        size={30}
                        style={{ color: '#09c' }}
                    >

                    </CgColorPicker>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                    {/* Hex */}
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '2px', background: '#fafafa', padding: '3px 6px', gap: '2px' }}>
                        <span style={{ color: '#aaa', fontSize: '11px' }}>#</span>
                        <input
                            type="text"
                            value={hexInput}
                            onChange={onHexChange}
                            onBlur={onHexBlur}
                            onKeyDown={onHexKeyDown}
                            onMouseDown={(e) => e.stopPropagation()}
                            maxLength={8}
                            placeholder="RRGGBB"
                            style={{ border: 'none', outline: 'none', fontSize: '11px', background: 'transparent', width: '100%', fontFamily: 'monospace', letterSpacing: '1px' }}
                        />

                    </div>
                    {/* R G B A */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[['r', 'R', rInput, rInputRef], ['g', 'G', gInput, gInputRef], ['b', 'B', bInput, bInputRef], ['a', 'A', aInput, aInputRef]].map(([ch, label, value, ref]) => (
                            <div key={ch} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                                <input
                                    ref={ref}
                                    type="text"
                                    value={value}
                                    onChange={(e) => onChannelChange(ch, e.target.value)}
                                    onKeyDown={(e) => { e.stopPropagation(); onChannelKeyDown(e, ch); }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                    maxLength={3}
                                    style={S.inputField}
                                />
                                <span style={{ color: '#888', fontSize: '10px' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Built-in Presets ── */}
            {PRESET_ROWS.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: '4px', marginBottom: '4px', maxWidth: '10.5%', width: '10.5%' }}>
                    {row.map((p) => (
                        <div
                            key={p}
                            onMouseDown={(e) => { e.preventDefault(); onPresetClick(p); }}
                            style={S.swatch(p, hexNow.toLowerCase() === p.toLowerCase())}
                            title={p}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

export default CustomColorPicker;