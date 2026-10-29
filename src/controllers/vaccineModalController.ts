/**
 * TÜRKİYE ULUSAL VE ÖZEL BAĞIŞIKLAMA PROTOKOLLERİ DETAY TABLOLARI DENETLEYİCİSİ
 * (VACCINE MODAL CONTROLLER - GBP 2026)
 * 
 * Ana arayüzün kalabalıklaşmasını önlemek amacıyla;
 * - Ulusal Çocukluk Dönemi GBP Takvimi (14 Nisan 2025 6'lı karma ve 1 Eylül 2026 48. ay suçiçeği 2. dozu)
 * - Özel ve İsteğe Bağlı Aşılar (Rotavirüs, MenACWY, MenB, HPV, Shingrix, İnfluenza)
 * - Özel Tıbbi Risk Grupları & Maternal Bağışıklama Protokolleri
 * - Kontrendikasyonlar ve Aşı Güvenlik Kalkanı
 * tablolarını kompakt bir köşe kutucuğu üzerinden zengin ve aranabilir bir modal olarak sunar.
 */

import { getEl } from '../utils/domUtils';

export type VaccineTabType = 'national' | 'special' | 'risks' | 'contra';

export function openVaccineModal(targetTab: VaccineTabType = 'national'): void {
    if (typeof document === 'undefined') return;
    const modal = getEl('modal-vaccine-tables');
    if (!modal) return;

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    switchVaccineTab(targetTab);

    // Otomatik arama kutusuna odaklan
    setTimeout(() => {
        const searchInput = document.getElementById('input-vaccine-filter') as HTMLInputElement | null;
        if (searchInput) {
            searchInput.focus();
        }
    }, 100);
}

export function closeVaccineModal(): void {
    if (typeof document === 'undefined') return;
    const modal = getEl('modal-vaccine-tables');
    if (!modal) return;

    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

export function switchVaccineTab(tab: VaccineTabType): void {
    if (typeof document === 'undefined') return;
    const tabs: VaccineTabType[] = ['national', 'special', 'risks', 'contra'];

    tabs.forEach(t => {
        const btn = getEl(`tab-btn-vax-${t}`);
        const panel = getEl(`tab-panel-vax-${t}`);

        if (btn && panel) {
            if (t === tab) {
                btn.className = 'tab-btn-vax px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm shadow-sky-950/40 flex items-center gap-1.5';
                panel.classList.remove('hidden');
            } else {
                btn.className = 'tab-btn-vax px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent flex items-center gap-1.5';
                panel.classList.add('hidden');
            }
        }
    });

    // Filtreleme yapılmışsa yeni sekmede de uygula
    const searchInput = document.getElementById('input-vaccine-filter') as HTMLInputElement | null;
    if (searchInput && searchInput.value.trim()) {
        filterVaccineRows(searchInput.value.trim());
    }
}

export function filterVaccineRows(query: string): void {
    if (typeof document === 'undefined') return;
    const q = query.toLowerCase().trim();
    const rows = document.querySelectorAll<HTMLElement>('.vaccine-table-row');
    const cards = document.querySelectorAll<HTMLElement>('.vaccine-flow-card');
    let matchCount = 0;

    rows.forEach(row => {
        const text = row.textContent?.toLowerCase() || '';
        if (!q || text.includes(q)) {
            row.style.display = '';
            matchCount++;
        } else {
            row.style.display = 'none';
        }
    });

    cards.forEach(card => {
        const text = card.textContent?.toLowerCase() || '';
        if (!q || text.includes(q)) {
            card.style.display = '';
            matchCount++;
        } else {
            card.style.display = 'none';
        }
    });

    const counter = getEl('vaccine-filter-counter');
    if (counter) {
        if (q) {
            counter.textContent = `${matchCount} sonuç bulundu`;
            counter.classList.remove('hidden');
        } else {
            counter.classList.add('hidden');
        }
    }
}

export function initVaccineModalController(): void {
    if (typeof document === 'undefined') return;

    // 1. Köşe Butonu (Ana Karttaki Tetikleyici)
    const openBtn = getEl('btn-open-vaccine-tables');
    if (openBtn) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openVaccineModal('national');
        });
    }

    // 2. Diğer dinamik tetikleyiciler (.btn-trigger-vax-modal)
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement | null;
        const trigger = target?.closest('.btn-trigger-vax-modal');
        if (trigger) {
            e.preventDefault();
            const tabAttr = trigger.getAttribute('data-tab') as VaccineTabType | null;
            openVaccineModal(tabAttr || 'national');
        }
    });

    // 3. Kapatma Butonu & Backdrop
    const closeBtn = getEl('btn-close-vaccine-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeVaccineModal);
    }

    const modal = getEl('modal-vaccine-tables');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeVaccineModal();
            }
        });
    }

    // 4. Klavye Esc Dinleyicisi
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const m = getEl('modal-vaccine-tables');
            if (m && !m.classList.contains('hidden')) {
                closeVaccineModal();
            }
        }
    });

    // 5. Sekme Değiştirme Butonları
    const tabs: VaccineTabType[] = ['national', 'special', 'risks', 'contra'];
    tabs.forEach(t => {
        const btn = getEl(`tab-btn-vax-${t}`);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                switchVaccineTab(t);
            });
        }
    });

    // 6. Canlı Arama / Filtreleme Kutusu
    const searchInput = document.getElementById('input-vaccine-filter') as HTMLInputElement | null;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filterVaccineRows(searchInput.value);
        });
    }

    const clearBtn = getEl('btn-clear-vaccine-filter');
    if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            filterVaccineRows('');
            searchInput.focus();
        });
    }
}
