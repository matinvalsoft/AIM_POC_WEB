/**
 * Auto-generated Airtable schema types
 * Generated from latest_schema.json
 * DO NOT EDIT MANUALLY - Run 'node scripts/generate-schema-types.js' to regenerate
 */

// Status constants for Invoice documents
export const INVOICE_STATUS = {
  PENDING: 'pending',
  OPEN: 'open',
  REVIEWED: 'reviewed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPORTED: 'exported',
} as const;

// Auto-generated field IDs from Airtable schema

export const FIELD_IDS = {
  FILES: {
    FILEID: 'fldvv1P403ZBW5bzD',
    INVOICEHEADERID: 'fldfWuCdkpNQj9Ldk',
    FILEURL: 'fldMOyx6UwMi6bEBe',
    FILEHASH: 'fld4ul9KRJUSKaUWS',
    FILENAME: 'fldIGVTS5FNOBGa6R',
    UPLOADDATE: 'fldNiceCZo3dSbvaD',
    STATUS: 'flduvY2bmQosJsn7n',
    PARSEDAT: 'fldtidSYAqPRmoW3e',
    ATTACHMENTS: 'fld3draNU7mkLeGqI',
    RAW_TEXT: 'fld1lL5zRXtTbt0A3',
    ERROR_CODE: 'flddPRt8iRsl1YYZM',
    ERROR_DESCRIPTION: 'flddfs5LMqSRF4gXO',
    ERROR_LINK: 'fldO1mNxkXBkp9hiC',
    CREATED_AT: 'fldPaMbKTIR1J6gAn',
    MODIFIED_AT: 'fldTqso4wgmGyPkUj',
    INVOICEHEADERS: 'fld8fYyXVZiKhNeDv',
    INVOICES: 'fldwKImJnsRbsWjHj',
  },
  INVOICES: {
    RECORDID: 'fldZ17knWjEOCfztq',
    INVOICE_NUMBER: 'fldWJIn3Sb0JSCr2a',
    VENDID: 'fldr9N3nkBSzTvOct',
    VENDOR_NAME: 'fldgdPfsIPIu6GFrg',
    AMOUNT: 'fldWskTDGmzu3udgQ',
    DATE: 'fldp1dFsyYtFcMk63',
    FREIGHT_CHARGE: 'fldmIOZypPrjc45MR',
    SURCHARGE: 'fld0zGVtnSUl4YWva',
    POS: 'fldmBwAkd2ekGDS3h',
    DOCUMENT_RAW_TEXT: 'fldYajj2Ql4O3ZJNl',
    FILES: 'fldvgp2k2Ro3xneyz',
    CREATED_AT: 'fldQTWe0E9ik9t3SW',
    MODIFIED_AT: 'fldtlqLgTn2IdBbkj',
    MATCHJSONPAYLOAD: 'fldFxQNImfvsULyL2',
    ERROR_CODE: 'fldBbD1mWcSqD5mn5',
    STATUS: 'fldbeTDRDaKibT17s',
    BALANCE: 'fldSjTjrW8Fso4j70',
    BALANCE_EXPLANATION: 'fldySfNaohpv3gv4l',
    POINVOICEHEADERS: 'fldzGkuubdu4lLy9n',
    FILE_RAW_TEXT: 'fldUsIefXXVrL9ugZ',
    MISSING_FIELDS: 'fldhUobiEpFG2S8E2',
  },
  POINVOICEHEADERS: {
    RECORDID: 'fldKuzxRLh9ebfwQ6',
    COMPANY_CODE: 'fldTxznaohx3570gT',
    STATUS: 'fldQG5aLrzWuybUGl',
    VENDID: 'fldHqAuDgGiFwEbNu',
    VENDOR_NAME: 'fldoQDBbjtB45u8Y0',
    INVOICE_DETAILS: 'fldDtXpleyIIKomex',
    AP_INVOICE_NUMBER: 'fldeLVE34jFJIZ4mt',
    INVOICE_DATE: 'fld965jyW6vfHSzve',
    TERMSID: 'fldEfXJh4GLbPWnQ4',
    DUE_DATE: 'fldaToVmDpqv9ONaF',
    REMIT_NAME: 'fldnqlfWxfsldK9bw',
    TOTAL_INVOICE_AMOUNT: 'fldCm1wXZcP8By64B',
    FREIGHT_CHARGE: 'fldlY0X5bukPwEL8m',
    MISCELLANEOUS_CHARGE: 'fldliitVmX1mosV3v',
    DISCOUNT_AMOUNT: 'fldVMtTKXIqwZwxyp',
    DISCOUNT_DATE: 'fldUUPq044MMnF5oJ',
    TAXID00: 'fld99Me7yA3uT9Dlg',
    TAXID01: 'fld9qJ9C83aOV5oni',
    TAXID02: 'fld679IZrwMt4R9BZ',
    TAXID03: 'fld5Ey8H28MnPLope',
    TAXTOT00: 'fldj76RPNLhY1tPb1',
    TAXTOT01: 'fldGaxViKpt3yFjyT',
    TAXTOT02: 'fldjZeRIq4fMGiEod',
    TAXTOT03: 'fldwC86weaUTWnVhS',
    TXBLTOT00: 'fldSts2L2SzKyUJ7J',
    TXBLTOT01: 'fldqpZlraRgJxdK6Z',
    TXBLTOT02: 'fldBAyP5RVW801lCB',
    TXBLTOT03: 'fldspyoZi8utbSIkL',
    CURYID: 'fldc59eW74gdn78Q4',
    PO_NUMBER_SEQ_TYPE: 'fldn5JONpJqhBHbyS',
    PO_NUMBER: 'fld2DoiZs6t3sq3ru',
    TYPE: 'fld8m7237dBbsJyZp',
    UPDATE_YN: 'fldsFz9XdZA7E5V2V',
    BALANCE_EXCEPTION_YN: 'fld9JKT03Uq60oBzX',
    APACCT: 'fldqTd1R4rlXq1zXN',
    APSUB: 'fldAiBcZrN7C4fFS8',
    CURYMULTDIV: 'fldGZcx5ypXYPKjpS',
    CURYRATE: 'fldPgqTjWKAb5Z9T5',
    CURYRATETYPE: 'fld17OblRg1DcLGV3',
    SURCHARGE: 'fld7hsHTZGxv2psSg',
    DOCUMENTATTACHMENT: 'flddZj4GmYKTIKa5p',
    ERRORCODE: 'flddH7m8XIlXZLvkR',
    DOCUMENT_RAW_TEXT: 'fldDGh2zVJXjpoTvX',
    CREATED_AT: 'fldTOi6cp2tzLromy',
    MODIFIED_AT: 'fld7UTUCBIDIP8bw4',
    INVOICES: 'fldlDBkOm2QV6vSSc',
  },
  POINVOICEDETAILS: {
    RECORDID: 'flddeN1uf4flGhHNS',
    COMPANY_CODE: 'fldaagXjpyrRtsy8e',
    VENDID: 'fldKjuYXhgwv8fcLs',
    AP_INVOICE_NUMBER: 'fld4i5XGZJi4sYyDV',
    LINE_NUMBER: 'fld3sdHL8z7RxoZTn',
    ITEM_NO: 'fldMeG51leLehcgNa',
    ITEM_DESCRIPTION: 'fld7iTo1UUNAjRAK4',
    INVOICE_PRICE: 'fldzRKqDHlSo168I5',
    INVOICE_PRICING_QTY: 'fldm3JJHqefoSzkY0',
    QUANTITY_INVOICED: 'fldyMWOPBZ0VSFS6Z',
    LINE_AMOUNT: 'fldogLboVcfjTq9M8',
    PO_NUMBER_SEQ_TYPE: 'fld8WcpVpCxKXXZMT',
    PO_NUMBER: 'fldCGNWvybCS5wLh0',
    PO_RELEASE_NUMBER: 'fldziXj8Hn4MSPvNc',
    PO_LINE_NUMBER: 'fldaRbB9j71w8TL9S',
    VENDOR_SHIP_NUMBER: 'fldlgZS1vfjADumtA',
    DATE_RECEIVED: 'fldvsBVEoR4wvpU4q',
    QUANTITY_RECEIVED: 'fldhbGZ18orSgmF9X',
    QUANTITY_ACCEPTED: 'fldmC8tCkMds0r1ss',
    PURCHASE_PRICE: 'fldOyoAVTjukUffi2',
    PRICING_QUANTITY: 'fldeEcQ2ZAupVq8h4',
    ALREADY_INVOICED_QTY: 'flduobfDtNnBX1FIF',
    EXPACCT: 'fldmYAfYSSYynpSf4',
    EXPSUB: 'fldCdFXPWyEMMZtbr',
    TAXID00: 'fldqkgiosIR3wJiiM',
    TAXAMT00: 'fldkOB2fQTWqOL3VI',
    TXBLAMT00: 'fldyxHWBYVhrICaED',
    PO_UOM: 'fldtC4OeorogNCBzW',
    INVOICED_IN_FULL_YN: 'fldTMFNrthWOMqwmt',
    GL_EXCEPTION_YN: 'fld3sBjJzVeqTA7p7',
    STATUS: 'fld3c6QiWMYO8fUrO',
    INVOICEHEADERS: 'fldS39vWDismMUvfC',
    CREATED_AT: 'fld17mKjXewbTA0vy',
    MODIFIED_AT: 'fldI3kD7U94DDThpi',
  },
} as const;

// Table names
export const TABLE_NAMES = {
  FILES: 'Files',
  INVOICES: 'Invoices',
  POINVOICEHEADERS: 'POInvoiceHeaders',
  POINVOICEDETAILS: 'POInvoiceDetails',
} as const;

// Airtable attachment type
export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size?: number;
  type?: string;
  thumbnails?: {
    small?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    full?: { url: string; width: number; height: number };
  };
}

export interface FilesFields {
  fileID: number;
  invoiceHeaderID?: string;
  fileURL?: string;
  fileHash?: string;
  fileName?: string;
  uploadDate?: string;
  status?: string;
  parsedAt?: string;
  attachments?: AirtableAttachment[];
  rawText?: string;
  errorCode?: string;
  errorDescription?: string;
  errorLink?: string;
  createdAt: string;
  modifiedAt?: string;
  invoiceHeaders?: string;
  invoices?: string[];
}

export interface InvoicesFields {
  recordID: number;
  invoiceNumber?: string;
  vendId?: string;
  vendorName?: string;
  amount?: number;
  date?: string;
  freightCharge?: number;
  surcharge?: number;
  pOs?: string;
  documentRawText?: string;
  files?: string[];
  createdAt: string;
  modifiedAt?: string;
  matchJSONPayload?: string;
  errorCode?: string;
  status?: string;
  balance?: number;
  balanceExplanation?: string;
  pOInvoiceHeaders?: string[];
  fileRawText?: any;
  missingFields?: any;
}

export interface POInvoiceHeadersFields {
  recordID: number;
  companyCode?: string;
  status?: string;
  vendId?: string;
  vendorName?: string;
  invoiceDetails?: string[];
  aPInvoiceNumber?: string;
  invoiceDate?: string;
  termsId?: string;
  dueDate?: string;
  remitName?: string;
  totalInvoiceAmount?: number;
  freightCharge?: number;
  miscellaneousCharge?: number;
  discountAmount?: number;
  discountDate?: string;
  taxID00?: string;
  taxID01?: string;
  taxID02?: string;
  taxID03?: string;
  taxTot00?: number;
  taxTot01?: number;
  taxTot02?: number;
  taxTot03?: number;
  txblTot00?: number;
  txblTot01?: number;
  txblTot02?: number;
  txblTot03?: number;
  curyId?: string;
  pONumberSeqType?: string;
  pONumber?: string;
  type?: string;
  updateYN?: boolean;
  balanceExceptionYN?: boolean;
  aPAcct?: string;
  aPSub?: string;
  curymultdiv?: boolean;
  curyRate?: number;
  curyratetype?: string;
  surcharge?: number;
  documentAttachment?: string;
  errorCode?: string;
  documentRawText?: string;
  createdAt: string;
  modifiedAt?: string;
  invoices?: string[];
}

export interface POInvoiceDetailsFields {
  recordID: number;
  companyCode?: string;
  vendId?: string;
  aPInvoiceNumber?: string;
  lineNumber?: string;
  itemNo?: string;
  itemDescription?: string;
  invoicePrice?: number;
  invoicePricingQty?: number;
  quantityInvoiced?: number;
  lineAmount?: number;
  pONumberSeqType?: string;
  pONumber?: string;
  pOReleaseNumber?: string;
  pOLineNumber?: string;
  vendorShipNumber?: string;
  dateReceived?: string;
  quantityReceived?: number;
  quantityAccepted?: number;
  purchasePrice?: number;
  pricingQuantity?: number;
  alreadyInvoicedQty?: number;
  expacct?: string;
  expsub?: string;
  taxID00?: string;
  taxAmt00?: number;
  txblAmt00?: number;
  pOUOM?: string;
  invoicedInFullYN?: boolean;
  gLExceptionYN?: boolean;
  status?: string;
  invoiceHeaders?: string[];
  createdAt: string;
  modifiedAt?: string;
}

export interface FilesRecord {
  fileID: number;
  invoiceHeaderID?: string;
  fileURL?: string;
  fileHash?: string;
  fileName?: string;
  uploadDate?: string;
  status?: string;
  parsedAt?: string;
  attachments?: AirtableAttachment[];
  rawText?: string;
  errorCode?: string;
  errorDescription?: string;
  errorLink?: string;
  createdAt: string;
  modifiedAt?: string;
  invoiceHeaders?: string;
  invoices?: string[];
}

export interface InvoicesRecord {
  recordID: number;
  invoiceNumber?: string;
  vendId?: string;
  vendorName?: string;
  amount?: number;
  date?: string;
  freightCharge?: number;
  surcharge?: number;
  pOs?: string;
  documentRawText?: string;
  files?: string[];
  createdAt: string;
  modifiedAt?: string;
  matchJSONPayload?: string;
  errorCode?: string;
  status?: string;
  balance?: number;
  balanceExplanation?: string;
  pOInvoiceHeaders?: string[];
  fileRawText?: any;
  missingFields?: any;
}

export interface POInvoiceHeadersRecord {
  recordID: number;
  companyCode?: string;
  status?: string;
  vendId?: string;
  vendorName?: string;
  invoiceDetails?: string[];
  aPInvoiceNumber?: string;
  invoiceDate?: string;
  termsId?: string;
  dueDate?: string;
  remitName?: string;
  totalInvoiceAmount?: number;
  freightCharge?: number;
  miscellaneousCharge?: number;
  discountAmount?: number;
  discountDate?: string;
  taxID00?: string;
  taxID01?: string;
  taxID02?: string;
  taxID03?: string;
  taxTot00?: number;
  taxTot01?: number;
  taxTot02?: number;
  taxTot03?: number;
  txblTot00?: number;
  txblTot01?: number;
  txblTot02?: number;
  txblTot03?: number;
  curyId?: string;
  pONumberSeqType?: string;
  pONumber?: string;
  type?: string;
  updateYN?: boolean;
  balanceExceptionYN?: boolean;
  aPAcct?: string;
  aPSub?: string;
  curymultdiv?: boolean;
  curyRate?: number;
  curyratetype?: string;
  surcharge?: number;
  documentAttachment?: string;
  errorCode?: string;
  documentRawText?: string;
  createdAt: string;
  modifiedAt?: string;
  invoices?: string[];
}

export interface POInvoiceDetailsRecord {
  recordID: number;
  companyCode?: string;
  vendId?: string;
  aPInvoiceNumber?: string;
  lineNumber?: string;
  itemNo?: string;
  itemDescription?: string;
  invoicePrice?: number;
  invoicePricingQty?: number;
  quantityInvoiced?: number;
  lineAmount?: number;
  pONumberSeqType?: string;
  pONumber?: string;
  pOReleaseNumber?: string;
  pOLineNumber?: string;
  vendorShipNumber?: string;
  dateReceived?: string;
  quantityReceived?: number;
  quantityAccepted?: number;
  purchasePrice?: number;
  pricingQuantity?: number;
  alreadyInvoicedQty?: number;
  expacct?: string;
  expsub?: string;
  taxID00?: string;
  taxAmt00?: number;
  txblAmt00?: number;
  pOUOM?: string;
  invoicedInFullYN?: boolean;
  gLExceptionYN?: boolean;
  status?: string;
  invoiceHeaders?: string[];
  createdAt: string;
  modifiedAt?: string;
}

