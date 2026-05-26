import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
export function imgUrl(src) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  return API_URL + src;
}


export function formatPrice(price) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getStatusColor(status) {
  switch (status) {
    case 'pending':
      return 'status-pending';
    case 'processing':
      return 'status-processing';
    case 'completed':
      return 'status-completed';
    case 'failed':
      return 'status-failed';
    default:
      return '';
  }
}

export function getStatusText(status) {
  switch (status) {
    case 'pending':
      return 'Menunggu Pembayaran';
    case 'processing':
      return 'Diproses';
    case 'completed':
      return 'Selesai';
    case 'failed':
      return 'Gagal';
    default:
      return status;
  }
}
