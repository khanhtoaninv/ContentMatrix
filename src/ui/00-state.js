// ---------- UI · Trạng thái dùng chung: dữ liệu, giao diện, bảng xử lý thao tác ----------
// Tách riêng để mọi module khác nhập được trước khi chạy (không phụ thuộc module nào ngoài logic).
export let S = null;               // trạng thái ứng dụng
export function setS(v) { S = v; }
export const view = {              // trạng thái giao diện (không lưu)
  screen: 'week', scrollToday: true, setupTab: 'brand', weekMode: 'week', monthAnchor: null, tpcSearch: '',
  chFilter: [], progressOpen: false, banner: null,
};
export const ACTIONS = {};         // data-act  → hàm xử lý bấm
export const CHANGES = {};         // data-change → hàm xử lý đổi giá trị
export const INPUTS = {};          // data-input  → hàm xử lý gõ phím
export const RENDERERS = {};       // màn hình → hàm dựng HTML
