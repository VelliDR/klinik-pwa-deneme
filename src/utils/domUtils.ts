/**
 * DOM ve Tip Güvenliği Yardımcıları (DOM Utilities & UI Helpers)
 * 
 * Güvenli element erişimi, HTML escaping, sayısal parsing ve
 * 60 FPS akıcılık için requestAnimationFrame tabanlı reaktif güncelleme zamanlayıcısı.
 */

export const escapeHtml = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

export const parseNum = (val: unknown): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
};

export const getEl = <T extends HTMLElement = HTMLElement>(id: string): T | null => {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id) as T | null;
};

export const getVal = (id: string): string => {
    const el = getEl<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id);
    return el ? el.value : '';
};

export const getNum = (id: string): number | null => {
    const el = getEl<HTMLInputElement | HTMLSelectElement>(id);
    return el ? parseNum(el.value) : null;
};

export const getChk = (id: string): boolean => {
    const el = getEl<HTMLInputElement>(id);
    return el ? el.checked : false;
};

/**
 * 60 FPS Reaktif Güncelleme Zamanlayıcısı (RAF Coalescing / Microtask Throttle)
 * 
 * Hızlı klavye yazımlarında her tuş vuruşunda 21 motorun tekrar tekrar eşzamanlı
 * çalışmasını engeller, ardışık olayları tek bir boyama (paint) karesinde birleştirir.
 */
let pendingRafId: number | null = null;

export const scheduleUpdate = (callback: () => void): void => {
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') {
        callback();
        return;
    }

    if (pendingRafId !== null) {
        cancelAnimationFrame(pendingRafId);
    }

    pendingRafId = requestAnimationFrame(() => {
        pendingRafId = null;
        callback();
    });
};
