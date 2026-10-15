import Papa from 'papaparse';
import {
  SalesRecord,
  InventoryRecord,
  PromotionRecord,
  StoreRecord,
  GroundTruthRecord,
} from '../types';

export interface ParsedCsvResult {
  fileName: string;
  headers: string[];
  rows: any[];
  rowCount: number;
  detectedType: 'sales' | 'inventory' | 'promotions' | 'stores' | 'groundTruth' | 'unknown';
  suggestedMapping: Record<string, string>;
  validationErrors: string[];
}

// Synonyms map to auto-detect header mappings
const KNOWN_SYNONYMS: Record<string, string[]> = {
  date: ['date', 'day', 'timestamp', 'txn_date', 'transaction_date', 'event_date'],
  store_id: ['store_id', 'store', 'storeid', 'location_id', 'shop_id', 'branch_id', 'unit_id'],
  sku: ['sku', 'item_code', 'product_id', 'item_id', 'upc', 'barcode', 'material_no', 'article_id'],
  units_sold: ['units_sold', 'qty', 'quantity', 'units', 'sales_units', 'sales_qty', 'volume', 'sold'],
  unit_price: ['unit_price', 'price', 'retail_price', 'selling_price', 'unit_retail', 'msrp'],
  recorded_stock: ['recorded_stock', 'stock', 'inventory', 'on_hand', 'qoh', 'stock_on_hand', 'inv_count', 'balance'],
  promotion_flag: ['promotion_flag', 'promotion', 'is_promoted', 'promo', 'on_sale', 'deal', 'promo_flag'],
  store_name: ['store_name', 'name', 'store_description', 'branch_name', 'location_name'],
  region: ['region', 'market', 'district', 'zone', 'territory', 'area'],
  is_phantom_stockout: ['is_phantom_stockout', 'phantom_stockout', 'confirmed_phantom', 'ground_truth', 'stockout_flag', 'label'],
};

export function detectFileType(headers: string[]): {
  type: 'sales' | 'inventory' | 'promotions' | 'stores' | 'groundTruth' | 'unknown';
  mapping: Record<string, string>;
} {
  const lowerHeaders = headers.map(h => h.trim().toLowerCase().replace(/[\s\-_]+/g, '_'));

  const findBestMatch = (field: string): string => {
    const synonyms = KNOWN_SYNONYMS[field] || [field];
    for (const syn of synonyms) {
      const idx = lowerHeaders.findIndex(h => h === syn || h.includes(syn));
      if (idx !== -1) {
        return headers[idx];
      }
    }
    return '';
  };

  const salesMatch = findBestMatch('units_sold');
  const inventoryMatch = findBestMatch('recorded_stock');
  const promoMatch = findBestMatch('promotion_flag');
  const storeNameMatch = findBestMatch('store_name');
  const groundTruthMatch = findBestMatch('is_phantom_stockout');

  const mapping: Record<string, string> = {
    date: findBestMatch('date'),
    store_id: findBestMatch('store_id'),
    sku: findBestMatch('sku'),
  };

  if (salesMatch) {
    mapping.units_sold = salesMatch;
    mapping.unit_price = findBestMatch('unit_price');
    return { type: 'sales', mapping };
  }

  if (inventoryMatch) {
    mapping.recorded_stock = inventoryMatch;
    return { type: 'inventory', mapping };
  }

  if (promoMatch) {
    mapping.promotion_flag = promoMatch;
    return { type: 'promotions', mapping };
  }

  if (groundTruthMatch) {
    mapping.is_phantom_stockout = groundTruthMatch;
    return { type: 'groundTruth', mapping };
  }

  if (storeNameMatch) {
    mapping.store_name = storeNameMatch;
    mapping.region = findBestMatch('region');
    return { type: 'stores', mapping };
  }

  return { type: 'unknown', mapping };
}

export function parseCsvFile(file: File): Promise<ParsedCsvResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        const headers = (results.meta.fields || []).map(h => h.trim());
        const { type, mapping } = detectFileType(headers);
        const validationErrors: string[] = [];

        if (results.errors && results.errors.length > 0) {
          results.errors.slice(0, 3).forEach(err => {
            validationErrors.push(`Row ${err.row}: ${err.message}`);
          });
        }

        resolve({
          fileName: file.name,
          headers,
          rows: results.data,
          rowCount: results.data.length,
          detectedType: type,
          suggestedMapping: mapping,
          validationErrors,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function convertToSalesRecords(
  rows: any[],
  mapping: Record<string, string>
): { records: SalesRecord[]; errors: string[] } {
  const records: SalesRecord[] = [];
  const errors: string[] = [];

  const dateCol = mapping.date;
  const storeCol = mapping.store_id;
  const skuCol = mapping.sku;
  const unitsCol = mapping.units_sold;
  const priceCol = mapping.unit_price;

  if (!dateCol || !storeCol || !skuCol || !unitsCol) {
    errors.push('Missing required column mappings for Sales dataset (date, store_id, sku, units_sold).');
    return { records, errors };
  }

  rows.forEach((row, idx) => {
    const rawDate = row[dateCol];
    const rawStore = row[storeCol];
    const rawSku = row[skuCol];
    const rawUnits = row[unitsCol];
    const rawPrice = priceCol ? row[priceCol] : 0;

    if (!rawDate || !rawStore || !rawSku) {
      if (idx < 5) errors.push(`Row ${idx + 1}: Missing mandatory date, store_id, or sku.`);
      return;
    }

    const units = Number(rawUnits);
    const price = priceCol ? (Number(rawPrice) || 0) : 0;

    records.push({
      date: String(rawDate).trim(),
      store_id: String(rawStore).trim(),
      sku: String(rawSku).trim(),
      units_sold: isNaN(units) ? 0 : units,
      unit_price: isNaN(price) ? 0 : price,
    });
  });

  return { records, errors };
}

export function convertToInventoryRecords(
  rows: any[],
  mapping: Record<string, string>
): { records: InventoryRecord[]; errors: string[] } {
  const records: InventoryRecord[] = [];
  const errors: string[] = [];

  const dateCol = mapping.date;
  const storeCol = mapping.store_id;
  const skuCol = mapping.sku;
  const stockCol = mapping.recorded_stock;

  if (!dateCol || !storeCol || !skuCol || !stockCol) {
    errors.push('Missing required column mappings for Inventory dataset (date, store_id, sku, recorded_stock).');
    return { records, errors };
  }

  rows.forEach((row, idx) => {
    const rawDate = row[dateCol];
    const rawStore = row[storeCol];
    const rawSku = row[skuCol];
    const rawStock = row[stockCol];

    if (!rawDate || !rawStore || !rawSku) {
      if (idx < 5) errors.push(`Row ${idx + 1}: Missing date, store, or SKU.`);
      return;
    }

    const stock = Number(rawStock);

    records.push({
      date: String(rawDate).trim(),
      store_id: String(rawStore).trim(),
      sku: String(rawSku).trim(),
      recorded_stock: isNaN(stock) ? 0 : stock,
    });
  });

  return { records, errors };
}

export function convertToPromotionRecords(
  rows: any[],
  mapping: Record<string, string>
): { records: PromotionRecord[]; errors: string[] } {
  const records: PromotionRecord[] = [];
  const errors: string[] = [];

  const dateCol = mapping.date;
  const storeCol = mapping.store_id;
  const skuCol = mapping.sku;
  const promoCol = mapping.promotion_flag;

  if (!dateCol || !storeCol || !skuCol || !promoCol) {
    errors.push('Missing required column mappings for Promotion dataset.');
    return { records, errors };
  }

  rows.forEach((row) => {
    const rawDate = row[dateCol];
    const rawStore = row[storeCol];
    const rawSku = row[skuCol];
    const rawPromo = row[promoCol];

    if (!rawDate || !rawStore || !rawSku) return;

    const isPromo =
      rawPromo === true ||
      rawPromo === 1 ||
      rawPromo === '1' ||
      String(rawPromo).toLowerCase() === 'true' ||
      String(rawPromo).toLowerCase() === 'yes';

    records.push({
      date: String(rawDate).trim(),
      store_id: String(rawStore).trim(),
      sku: String(rawSku).trim(),
      promotion_flag: isPromo,
    });
  });

  return { records, errors };
}

export function convertToStoreRecords(
  rows: any[],
  mapping: Record<string, string>
): { records: StoreRecord[]; errors: string[] } {
  const records: StoreRecord[] = [];
  const errors: string[] = [];

  const storeCol = mapping.store_id;
  const nameCol = mapping.store_name;
  const regionCol = mapping.region;

  if (!storeCol) {
    errors.push('Missing required column mapping for Store ID.');
    return { records, errors };
  }

  rows.forEach((row) => {
    const rawStore = row[storeCol];
    if (!rawStore) return;

    records.push({
      store_id: String(rawStore).trim(),
      store_name: nameCol && row[nameCol] ? String(row[nameCol]).trim() : `Store ${rawStore}`,
      region: regionCol && row[regionCol] ? String(row[regionCol]).trim() : 'General Region',
    });
  });

  return { records, errors };
}

export function convertToGroundTruthRecords(
  rows: any[],
  mapping: Record<string, string>
): { records: GroundTruthRecord[]; errors: string[] } {
  const records: GroundTruthRecord[] = [];
  const errors: string[] = [];

  const storeCol = mapping.store_id;
  const skuCol = mapping.sku;
  const labelCol = mapping.is_phantom_stockout;

  if (!storeCol || !skuCol || !labelCol) {
    errors.push('Missing required column mappings for Ground Truth dataset (store_id, sku, is_phantom_stockout).');
    return { records, errors };
  }

  rows.forEach((row) => {
    const rawStore = row[storeCol];
    const rawSku = row[skuCol];
    const rawLabel = row[labelCol];

    if (!rawStore || !rawSku) return;

    const isPhantom =
      rawLabel === true ||
      rawLabel === 1 ||
      rawLabel === '1' ||
      String(rawLabel).toLowerCase() === 'true' ||
      String(rawLabel).toLowerCase() === 'yes';

    records.push({
      store_id: String(rawStore).trim(),
      sku: String(rawSku).trim(),
      is_phantom_stockout: isPhantom,
      notes: row.notes || row.comment || undefined,
    });
  });

  return { records, errors };
}
