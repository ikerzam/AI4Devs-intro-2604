/**
 * Reverse String — AI4Devs exercise
 *
 * Reverses a string by GRAPHEMES, not by code units, so that:
 *   - Astral / surrogate-pair characters (emojis like 😀) are not split.
 *   - Combining marks stay attached to their base character (é, 한, etc.).
 *   - Compound emojis joined by ZWJ (👨‍👩‍👧, 👩🏽‍🚀) are preserved.
 *   - Flag sequences (🇪🇸, 🇯🇵) are kept as a single visual unit.
 *
 * Strategy:
 *   1) Prefer Intl.Segmenter with granularity 'grapheme' (modern browsers).
 *   2) Fallback to Array.from(str), which already handles surrogate pairs
 *      (so simple emojis still work) — combining marks and ZWJ sequences
 *      may split in this fallback, but plain ASCII / BMP text is fine.
 */

(function () {
    'use strict';

    // ----- Element references -----
    const inputEl = document.getElementById('input');
    const outputEl = document.getElementById('output');
    const reverseBtn = document.getElementById('reverseBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const swapBtn = document.getElementById('swapBtn');
    const inputCountEl = document.getElementById('inputCount');
    const outputCountEl = document.getElementById('outputCount');
    const toastEl = document.getElementById('toast');

    const EMPTY_PLACEHOLDER = 'Your reversed text will appear here.';

    // ----- Grapheme segmenter (cached) -----
    let segmenter = null;
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
        try {
            segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        } catch (_) {
            segmenter = null;
        }
    }

    /**
     * Split a string into an array of user-perceived characters (graphemes).
     * @param {string} str
     * @returns {string[]}
     */
    function toGraphemes(str) {
        if (segmenter) {
            const out = [];
            for (const seg of segmenter.segment(str)) {
                out.push(seg.segment);
            }
            return out;
        }
        // Fallback: handles surrogate pairs but not full grapheme clusters.
        return Array.from(str);
    }

    /**
     * Reverse a string preserving graphemes.
     * @param {string} str
     * @returns {string}
     */
    function reverseString(str) {
        if (typeof str !== 'string') return '';
        if (str.length === 0) return '';
        return toGraphemes(str).reverse().join('');
    }

    /**
     * Count graphemes (visible characters) in a string.
     * @param {string} str
     * @returns {number}
     */
    function countGraphemes(str) {
        if (!str) return 0;
        if (segmenter) {
            let n = 0;
            // eslint-disable-next-line no-unused-vars
            for (const _ of segmenter.segment(str)) n++;
            return n;
        }
        return Array.from(str).length;
    }

    // ----- Toast (lightweight notifications) -----
    let toastTimer = null;

    /**
     * Show a transient message at the bottom of the screen.
     * @param {string} message
     * @param {'info'|'error'} [type='info']
     */
    function showToast(message, type = 'info') {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.toggle('error', type === 'error');
        toastEl.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastEl.classList.remove('show');
        }, 1800);
    }

    // ----- Rendering -----
    function renderOutput(value) {
        const isEmpty = value.length === 0;
        outputEl.dataset.empty = String(isEmpty);
        outputEl.textContent = isEmpty ? EMPTY_PLACEHOLDER : value;

        const inputCount = countGraphemes(inputEl.value);
        const outputCount = isEmpty ? 0 : countGraphemes(value);
        inputCountEl.textContent = inputCount === 1 ? '1 char' : `${inputCount} chars`;
        outputCountEl.textContent = outputCount === 1 ? '1 char' : `${outputCount} chars`;

        // Disable buttons that need content
        copyBtn.disabled = isEmpty;
        swapBtn.disabled = isEmpty;
        clearBtn.disabled = inputEl.value.length === 0 && isEmpty;
    }

    /**
     * Read the current input, validate, and update the output.
     */
    function update() {
        const raw = inputEl.value;
        // Hard cap to keep things responsive on extreme pastes.
        const MAX_LEN = 100_000;
        if (raw.length > MAX_LEN) {
            inputEl.value = raw.slice(0, MAX_LEN);
            showToast(`Input trimmed to ${MAX_LEN.toLocaleString()} characters`, 'error');
        }
        renderOutput(reverseString(inputEl.value));
    }

    // ----- Clipboard with legacy fallback -----
    /**
     * Copy text to clipboard. Uses the async Clipboard API when available
     * (HTTPS / localhost / focused page) and falls back to the legacy
     * document.execCommand('copy') trick for HTTP, file://, older browsers
     * and contexts where the modern API is blocked.
     *
     * @param {string} text
     * @returns {Promise<boolean>}
     */
    async function copyToClipboard(text) {
        if (!text) return false;

        // Modern API — only works in secure contexts (HTTPS / localhost).
        if (
            typeof navigator !== 'undefined' &&
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === 'function' &&
            window.isSecureContext
        ) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (_) {
                // Permission denied, document not focused, etc. → fall through.
            }
        }

        // Legacy fallback using a hidden textarea + execCommand('copy').
        return legacyCopy(text);
    }

    /**
     * @param {string} text
     * @returns {boolean}
     */
    function legacyCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        // Avoid scrolling to bottom on iOS / mobile.
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.width = '1px';
        ta.style.height = '1px';
        ta.style.padding = '0';
        ta.style.border = 'none';
        ta.style.outline = 'none';
        ta.style.boxShadow = 'none';
        ta.style.background = 'transparent';
        ta.style.opacity = '0';

        document.body.appendChild(ta);

        // Preserve previous selection so we don't disrupt the user.
        const selection = document.getSelection();
        const previousRange =
            selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        let ok = false;
        try {
            ta.focus();
            ta.select();
            ta.setSelectionRange(0, ta.value.length);
            ok = document.execCommand && document.execCommand('copy');
        } catch (_) {
            ok = false;
        }

        document.body.removeChild(ta);

        if (previousRange && selection) {
            selection.removeAllRanges();
            selection.addRange(previousRange);
        }

        return Boolean(ok);
    }

    // ----- Event wiring -----
    inputEl.addEventListener('input', update);

    reverseBtn.addEventListener('click', () => {
        update();
        // Soft feedback even if the button isn't strictly needed (live update).
        if (inputEl.value.length === 0) {
            showToast('Type something first', 'error');
            inputEl.focus();
            return;
        }
        showToast('Reversed');
    });

    clearBtn.addEventListener('click', () => {
        if (inputEl.value.length === 0) return;
        inputEl.value = '';
        update();
        inputEl.focus();
    });

    swapBtn.addEventListener('click', () => {
        const reversed = reverseString(inputEl.value);
        if (!reversed) return;
        inputEl.value = reversed;
        update();
        inputEl.focus();
    });

    copyBtn.addEventListener('click', async () => {
        const reversed = reverseString(inputEl.value);
        if (!reversed) {
            showToast('Nothing to copy', 'error');
            return;
        }
        const ok = await copyToClipboard(reversed);
        if (ok) {
            showToast('Copied to clipboard');
        } else {
            showToast('Copy failed — select the text manually', 'error');
        }
    });

    // Keyboard shortcuts: Ctrl/Cmd + Enter to reverse focus, Esc to clear.
    inputEl.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            reverseBtn.click();
        } else if (e.key === 'Escape' && inputEl.value.length > 0) {
            e.preventDefault();
            clearBtn.click();
        }
    });

    // Initial render.
    update();
})();
