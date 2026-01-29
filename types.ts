
export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface InvoiceItem {
  id: string;
  particulars: string;
  quantity: number;
  weight: number;
  weightUnit: string;
  unitPrice: number;
  total: number;
}

export interface ItemTemplate {
  id: string;
  particulars: string;
  weight: number;
  weightUnit: string;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  date: string;
  customer: CustomerDetails;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  isGstEnabled: boolean;
  footerText?: string;
  signature?: string; // Base64 signature image
}
