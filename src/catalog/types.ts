/**
 * Catalog types.
 *
 * `costAed` and `costUsd` are integer minor units (fils / cents) — the catalog shares
 * the same money discipline as the pricing engine, so when we snapshot a cost onto a
 * line we never go through a float.
 */

export interface CatalogProduct {
  readonly id: string;
  readonly location: string;
  readonly category: string;
  readonly tour: string;
  readonly product: string;
  readonly transferOption: string;
  readonly costAed: number;
  readonly costUsd: number;
  readonly supplier: string;
  readonly childCostAed?: number;
  readonly toddlerCostAed?: number;
  readonly sourceSheet?: string;
  readonly productGroup?: string;
}

export interface CatalogTransport {
  readonly id: string;
  readonly supplier: string;
  readonly route: string;
  readonly vehicleSize: string;
  readonly rateAed: number;
  readonly parkingAed?: number;
}

export interface CatalogCityTour {
  readonly id: string;
  readonly name: string;
  readonly type: 'sharing' | 'private';
  readonly rateAed: number;
  readonly duration?: string;
  readonly itinerary?: string[];
}

export interface CatalogHotelRoomType {
  readonly name: string;
  readonly rackRateAed: number;   // minor units (fils)
  readonly capacity?: number;
}

export interface CatalogHotel {
  readonly id: string;
  readonly name: string;
  readonly starRating: number;    // 1..5
  readonly location: string;
  readonly supplier: string;
  readonly roomTypes: readonly CatalogHotelRoomType[];
  readonly amenities?: readonly string[];
  readonly description?: string;
  readonly imageUrl?: string;
}

export interface CatalogDefaults {
  readonly markupPct: number;
  readonly fxAedPerUsd: number;
  readonly fxInrPerUsd: number;
  readonly fxAedPerInr: number;
  readonly importedAt: string;
  readonly productCount: number;
}

export interface SearchFilters {
  readonly location?: string;
  readonly category?: string;
  readonly transferOption?: string;
}

export interface SearchHit {
  readonly product: CatalogProduct;
  readonly score: number;
}
