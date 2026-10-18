// The business's products, sales and ad spend. Example data for now; later this
// comes from the owner's Amazon seller account.

export interface Product {
  id: string;
  name: string;
  /** £ paid per item. */
  buyPrice: number;
  /** £ FBA fee per item. */
  fulfilmentFee: number;
  /** Units waiting in Amazon's warehouse. */
  stockAtAmazon: number;
}

export interface Sale {
  /** YYYY-MM-DD */
  date: string;
  productId: string;
  units: number;
  /** £ price the customer paid per item. */
  unitPrice: number;
}

export interface AdSpend {
  /** YYYY-MM-DD */
  date: string;
  productId: string;
  amount: number;
}

export interface BusinessData {
  products: Product[];
  sales: Sale[];
  adSpend: AdSpend[];
  /** Last day the data covers (YYYY-MM-DD). */
  asOf: string;
  /** True while the dashboard shows made-up example numbers. */
  isExample: boolean;
}
