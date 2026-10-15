import {
  SalesRecord,
  InventoryRecord,
  PromotionRecord,
  StoreRecord,
  GroundTruthRecord,
  ProductCatalogItem,
  DatasetState,
} from '../types';

import { USD_TO_INR_EXCHANGE_RATE } from '../utils/currency';

export { USD_TO_INR_EXCHANGE_RATE };

export const DEMO_STORES: StoreRecord[] = [
  { store_id: 'ST-101', store_name: 'Metro Flagship Downtown', region: 'North Urban' },
  { store_id: 'ST-102', store_name: 'North Bay Supercenter', region: 'North Suburban' },
  { store_id: 'ST-103', store_name: 'Westside Express Mart', region: 'West Metro' },
  { store_id: 'ST-104', store_name: 'South Valley Mall Anchor', region: 'South Regional' },
  { store_id: 'ST-105', store_name: 'Eastside Plaza Superstore', region: 'East Metro' },
];

/**
 * Demo product catalog with underlying retail prices converted from USD to INR
 * Exchange Rate Assumption: 1 USD = 83 INR (Documented Indian retail conversion rate)
 */
export const DEMO_PRODUCTS: ProductCatalogItem[] = [
  { sku: 'SKU-1001', product_name: 'Organic Whole Milk 1-Gallon', category: 'Dairy & Refrigerated', default_price: 414.00 }, // $4.99 * 83
  { sku: 'SKU-1002', product_name: 'Nitro Cold Brew Coffee 32oz', category: 'Beverages', default_price: 456.00 },           // $5.49 * 83
  { sku: 'SKU-1003', product_name: 'Artisan Sourdough Loaf 24oz', category: 'Bakery', default_price: 356.00 },              // $4.29 * 83
  { sku: 'SKU-1004', product_name: 'White Truffle Infused Olive Oil 250ml', category: 'Gourmet Pantry', default_price: 2074.00 }, // $24.99 * 83
  { sku: 'SKU-1005', product_name: 'Wireless ANC Earbuds Pro-Sound', category: 'Electronics & Audio', default_price: 4149.00 },   // $49.99 * 83
  { sku: 'SKU-1006', product_name: 'Greek Whole Milk Yogurt 32oz', category: 'Dairy & Refrigerated', default_price: 497.00 },     // $5.99 * 83
  { sku: 'SKU-1007', product_name: 'Ultra Clean Laundry Detergent Pods 42ct', category: 'Household Essentials', default_price: 1659.00 }, // $19.99 * 83
  { sku: 'SKU-1008', product_name: 'Electrolyte Hydration Drink 6pk', category: 'Beverages', default_price: 705.00 },            // $8.49 * 83
  { sku: 'SKU-1009', product_name: 'Organic Cage-Free Brown Eggs 12pk', category: 'Dairy & Refrigerated', default_price: 373.00 }, // $4.49 * 83
  { sku: 'SKU-1010', product_name: 'Cold-Pressed Extra Virgin Olive Oil 1L', category: 'Gourmet Pantry', default_price: 1244.00 }, // $14.99 * 83
  { sku: 'SKU-1011', product_name: 'Dry Roasted Salted Almonds 16oz', category: 'Snacks & Nuts', default_price: 746.00 },         // $8.99 * 83
  { sku: 'SKU-1012', product_name: 'Dark Chocolate Sea Salt Bar 3.5oz', category: 'Confectionery', default_price: 290.00 },       // $3.49 * 83
  { sku: 'SKU-1013', product_name: 'Hospital-Grade Disinfectant Wipes 75ct', category: 'Household Essentials', default_price: 539.00 }, // $6.49 * 83
  { sku: 'SKU-1014', product_name: 'Sparkling Mineral Water 12pk Cans', category: 'Beverages', default_price: 663.00 },          // $7.99 * 83
  { sku: 'SKU-1015', product_name: 'Organic Hass Avocados 4-Pack Bag', category: 'Fresh Produce', default_price: 497.00 },        // $5.99 * 83
  { sku: 'SKU-1016', product_name: 'Advanced Enamel Whitening Toothpaste 6oz', category: 'Personal Care', default_price: 398.00 }, // $4.79 * 83
  { sku: 'SKU-1017', product_name: 'High-Capacity Rechargeable AA Batteries 4pk', category: 'Electronics & Hardware', default_price: 1161.00 }, // $13.99 * 83
  { sku: 'SKU-1018', product_name: 'Ceremonial Grade Matcha Powder 100g', category: 'Specialty Beverages', default_price: 1825.00 }, // $21.99 * 83
];

/**
 * Generate 35 days of synthetic history ending today.
 * Simulates specific realistic scenarios:
 * 1. Classic phantom stock-out (SKU-1001 in ST-101): High regular sales 15-20/day, recorded stock 48, drops to 0 for last 5 days.
 * 2. Promo phantom stock-out (SKU-1002 in ST-102): On 20% promotion last 4 days, recorded stock 55, zero sales during promo!
 * 3. Normal selling staple (SKU-1003 in ST-101, SKU-1009): steady sales every day.
 * 4. Low demand slow mover (SKU-1004): 0.2 sales/day, frequent 0 sales days historically. Must NOT be flagged!
 * 5. High-shrink target phantom stock-out (SKU-1005 in ST-101): Electronics item, 4-6 sales/day, recorded stock 24, suddenly 0 for 6 days.
 * 6. Stale inventory scenario (SKU-1007 in ST-103): Inventory snapshot missing for past 9 days, confidence penalty.
 * 7. Missing on shelf / top-stock stranded (SKU-1013 in ST-104): Household wipes with 32 in stock, 0 sales for 4 days.
 */
export function generateDemoDataset(): DatasetState {
  const sales: SalesRecord[] = [];
  const inventory: InventoryRecord[] = [];
  const promotions: PromotionRecord[] = [];
  const groundTruth: GroundTruthRecord[] = [];

  const today = new Date();
  const daysTotal = 35;
  const recentDays = 7;

  // Pre-seed known ground-truth labels for validation benchmarks
  groundTruth.push(
    { store_id: 'ST-101', sku: 'SKU-1001', is_phantom_stockout: true, notes: 'Whole milk pallet stranded in backroom cooler; shelf was empty' },
    { store_id: 'ST-102', sku: 'SKU-1002', is_phantom_stockout: true, notes: 'Cold brew promotional display removed early by vendor; product not on peg' },
    { store_id: 'ST-101', sku: 'SKU-1005', is_phantom_stockout: true, notes: 'Wireless earbuds stock stolen from locked display case (shrinkage)' },
    { store_id: 'ST-104', sku: 'SKU-1013', is_phantom_stockout: true, notes: 'Disinfectant wipes placed on overhead riser instead of active planogram shelf' },
    { store_id: 'ST-103', sku: 'SKU-1017', is_phantom_stockout: true, notes: 'AA Batteries peg hook tag fallen off; items hidden behind adjacent flashlight display' },
    { store_id: 'ST-102', sku: 'SKU-1016', is_phantom_stockout: true, notes: 'Toothpaste barcode label scratched on batch; scanner failed' },
    { store_id: 'ST-101', sku: 'SKU-1003', is_phantom_stockout: false, notes: 'Normal staple sales confirmed on shelf' },
    { store_id: 'ST-101', sku: 'SKU-1004', is_phantom_stockout: false, notes: 'Slow-moving specialty truffle oil; naturally low demand' },
    { store_id: 'ST-102', sku: 'SKU-1009', is_phantom_stockout: false, notes: 'Active cage-free eggs selling at steady 22 units/day' },
    { store_id: 'ST-103', sku: 'SKU-1010', is_phantom_stockout: false, notes: 'Olive oil inventory and shelf verified accurate' },
    { store_id: 'ST-105', sku: 'SKU-1018', is_phantom_stockout: false, notes: 'Matcha powder sells 1 unit every 4-5 days; verified present on shelf' },
  );

  // Generate date list
  const dateStrings: string[] = [];
  for (let i = daysTotal - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dateStrings.push(d.toISOString().split('T')[0]);
  }

  for (const store of DEMO_STORES) {
    for (const prod of DEMO_PRODUCTS) {
      // Determine behavior profile for this store + sku
      const isPhantomWholeMilk = store.store_id === 'ST-101' && prod.sku === 'SKU-1001';
      const isPromoColdBrew = store.store_id === 'ST-102' && prod.sku === 'SKU-1002';
      const isPhantomEarbuds = store.store_id === 'ST-101' && prod.sku === 'SKU-1005';
      const isStaleLaundry = store.store_id === 'ST-103' && prod.sku === 'SKU-1007';
      const isPhantomWipes = store.store_id === 'ST-104' && prod.sku === 'SKU-1013';
      const isPhantomBatteries = store.store_id === 'ST-103' && prod.sku === 'SKU-1017';
      const isPhantomToothpaste = store.store_id === 'ST-102' && prod.sku === 'SKU-1016';
      const isSlowMover = prod.sku === 'SKU-1004' || prod.sku === 'SKU-1018';

      // Base daily demand profile
      let baseAvg = 8.0;
      if (prod.sku === 'SKU-1001') baseAvg = 18.0; // Milk (staple)
      else if (prod.sku === 'SKU-1002') baseAvg = 12.0; // Cold brew
      else if (prod.sku === 'SKU-1003') baseAvg = 15.0; // Sourdough
      else if (prod.sku === 'SKU-1004') baseAvg = 0.25; // Truffle oil (intermittent slow mover)
      else if (prod.sku === 'SKU-1005') baseAvg = 5.0; // Earbuds
      else if (prod.sku === 'SKU-1007') baseAvg = 7.0; // Pods
      else if (prod.sku === 'SKU-1009') baseAvg = 20.0; // Eggs
      else if (prod.sku === 'SKU-1013') baseAvg = 9.0; // Wipes
      else if (prod.sku === 'SKU-1016') baseAvg = 11.0; // Toothpaste
      else if (prod.sku === 'SKU-1017') baseAvg = 6.0; // Batteries
      else if (prod.sku === 'SKU-1018') baseAvg = 0.3; // Matcha

      // Adjust for store volume
      if (store.store_id === 'ST-101') baseAvg *= 1.2;
      if (store.store_id === 'ST-103') baseAvg *= 0.85;

      let currentStock = Math.max(12, Math.round(baseAvg * 4.5 + (Math.random() * 10 - 5)));
      if (isSlowMover) currentStock = 6;

      for (let dayIdx = 0; dayIdx < daysTotal; dayIdx++) {
        const dateStr = dateStrings[dayIdx];
        const isRecentWindow = dayIdx >= daysTotal - recentDays;
        const daysFromEnd = daysTotal - 1 - dayIdx;

        // Promotion simulation
        let isPromo = false;
        if (isPromoColdBrew && dayIdx >= daysTotal - 7) {
          isPromo = true;
        } else if ((prod.sku === 'SKU-1014' || prod.sku === 'SKU-1011') && dayIdx >= daysTotal - 10 && dayIdx <= daysTotal - 3) {
          isPromo = true;
        }

        if (isPromo) {
          promotions.push({
            date: dateStr,
            store_id: store.store_id,
            sku: prod.sku,
            promotion_flag: true,
          });
        }

        // Units sold simulation
        let unitsSold = 0;
        if (isPhantomWholeMilk && daysFromEnd < 5) {
          unitsSold = 0; // Collapsed to 0 for 5 days while stock is 48!
        } else if (isPromoColdBrew && daysFromEnd < 4) {
          unitsSold = 0; // Promoted, yet 0 sales for 4 days!
        } else if (isPhantomEarbuds && daysFromEnd < 6) {
          unitsSold = 0; // High value electronics, 0 sales for 6 days
        } else if (isPhantomWipes && daysFromEnd < 4) {
          unitsSold = 0;
        } else if (isPhantomBatteries && daysFromEnd < 5) {
          unitsSold = 0;
        } else if (isPhantomToothpaste && daysFromEnd < 4) {
          unitsSold = 0;
        } else if (isSlowMover) {
          // Poisson intermittent demand: mostly 0, occasionally 1 or 2
          const rand = Math.random();
          unitsSold = rand > 0.78 ? (rand > 0.95 ? 2 : 1) : 0;
        } else {
          // Standard Poisson-like random sales around baseAvg
          const noise = (Math.random() - 0.5) * 2;
          const promoMultiplier = isPromo ? 1.6 : 1.0;
          const target = Math.max(0, (baseAvg + noise) * promoMultiplier);
          // Day-of-week factor (slightly higher on weekend)
          const dow = (dayIdx + 2) % 7;
          const weekendFactor = (dow === 5 || dow === 6) ? 1.25 : 0.95;
          unitsSold = Math.max(0, Math.round(target * weekendFactor + (Math.random() * 2 - 1)));
        }

        sales.push({
          date: dateStr,
          store_id: store.store_id,
          sku: prod.sku,
          units_sold: unitsSold,
          unit_price: prod.default_price,
        });

        // Inventory snapshot simulation
        // In real retail, snapshot is recorded periodically or daily
        if (isStaleLaundry && dayIdx >= daysTotal - 9) {
          // Stale inventory snapshot: don't record recent daily inventory to test stale warning!
        } else {
          // If phantom stockout is happening, the system still registers positive phantom stock!
          if (isPhantomWholeMilk && daysFromEnd < 5) {
            currentStock = 45; // False positive recorded stock
          } else if (isPromoColdBrew && daysFromEnd < 4) {
            currentStock = 58;
          } else if (isPhantomEarbuds && daysFromEnd < 6) {
            currentStock = 22;
          } else if (isPhantomWipes && daysFromEnd < 4) {
            currentStock = 34;
          } else if (isPhantomBatteries && daysFromEnd < 5) {
            currentStock = 28;
          } else if (isPhantomToothpaste && daysFromEnd < 4) {
            currentStock = 42;
          } else {
            // Natural depletion and restocking
            currentStock = Math.max(2, currentStock - unitsSold);
            if (currentStock < baseAvg * 1.5) {
              currentStock += Math.round(baseAvg * 5 + Math.random() * 5); // Replenished shipment
            }
          }

          inventory.push({
            date: dateStr,
            store_id: store.store_id,
            sku: prod.sku,
            recorded_stock: currentStock,
          });
        }
      }
    }
  }

  return {
    sales,
    inventory,
    promotions,
    stores: DEMO_STORES,
    groundTruth,
    isDemoData: true,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generate CSV text for downloadable templates
 */
export function generateSampleCsvContent(type: 'sales' | 'inventory' | 'promotions' | 'stores' | 'groundTruth'): string {
  const dataset = generateDemoDataset();

  if (type === 'sales') {
    const header = 'date,store_id,sku,units_sold,unit_price\n';
    const rows = dataset.sales.slice(0, 150).map(s =>
      `${s.date},${s.store_id},${s.sku},${s.units_sold},${s.unit_price}`
    ).join('\n');
    return header + rows;
  }

  if (type === 'inventory') {
    const header = 'date,store_id,sku,recorded_stock\n';
    const rows = dataset.inventory.slice(0, 150).map(i =>
      `${i.date},${i.store_id},${i.sku},${i.recorded_stock}`
    ).join('\n');
    return header + rows;
  }

  if (type === 'promotions') {
    const header = 'date,store_id,sku,promotion_flag\n';
    const rows = dataset.promotions.slice(0, 150).map(p =>
      `${p.date},${p.store_id},${p.sku},${p.promotion_flag ? 1 : 0}`
    ).join('\n');
    return header + rows;
  }

  if (type === 'stores') {
    const header = 'store_id,store_name,region\n';
    const rows = dataset.stores.map(st =>
      `"${st.store_id}","${st.store_name}","${st.region}"`
    ).join('\n');
    return header + rows;
  }

  if (type === 'groundTruth') {
    const header = 'store_id,sku,is_phantom_stockout,notes\n';
    const rows = dataset.groundTruth.map(gt =>
      `"${gt.store_id}","${gt.sku}",${gt.is_phantom_stockout ? 'true' : 'false'},"${gt.notes || ''}"`
    ).join('\n');
    return header + rows;
  }

  return '';
}
