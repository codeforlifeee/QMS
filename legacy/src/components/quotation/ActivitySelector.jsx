import React, { useState, useMemo } from 'react';
import { Select, Button, Input } from '../ui/index.jsx';
import { formatCurrency } from '../../utils/calculations';
import { X, Plus } from 'lucide-react';

export const ActivitySelector = ({ tourData, onAddActivity, selectedActivities = [] }) => {
  const [filters, setFilters] = useState({
    location: '',
    category: '',
    tour: '',
    product: '',
    transfer: '',
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get filtered categories
  const categories = useMemo(() => {
    if (!filters.location || !tourData.categories[filters.location]) {
      return [];
    }
    return tourData.categories[filters.location];
  }, [filters.location, tourData.categories]);

  // Get filtered tours
  const tours = useMemo(() => {
    if (!filters.location || !filters.category) return [];
    const key = `${filters.location}|${filters.category}`;
    return tourData.tours[key] || [];
  }, [filters.location, filters.category, tourData.tours]);

  // Get filtered products
  const products = useMemo(() => {
    return tourData.products.filter((p) => {
      const matchLocation = !filters.location || p.location === filters.location;
      const matchCategory = !filters.category || p.category === filters.category;
      const matchTour = !filters.tour || p.tour === filters.tour;
      const matchTransfer = !filters.transfer || p.transfer === filters.transfer;

      return matchLocation && matchCategory && matchTour && matchTransfer;
    });
  }, [filters, tourData.products]);

  // Filter products by search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter((p) =>
      p.product.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleLocationChange = (e) => {
    setFilters({
      ...filters,
      location: e.target.value,
      category: '',
      tour: '',
      product: '',
      transfer: '',
    });
    setSelectedProduct(null);
  };

  const handleCategoryChange = (e) => {
    setFilters({
      ...filters,
      category: e.target.value,
      tour: '',
      product: '',
      transfer: '',
    });
    setSelectedProduct(null);
  };

  const handleTourChange = (e) => {
    setFilters({
      ...filters,
      tour: e.target.value,
      product: '',
      transfer: '',
    });
    setSelectedProduct(null);
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setFilters({
      ...filters,
      product: product.product,
    });
  };

  const handleTransferChange = (e) => {
    setFilters({
      ...filters,
      transfer: e.target.value,
    });
    setSelectedProduct(null);
  };

  const handleAddActivity = () => {
    if (selectedProduct) {
      onAddActivity({
        ...selectedProduct,
        id: `${selectedProduct.location}-${selectedProduct.tour}-${Date.now()}`,
      });
      // Reset form
      setFilters({
        location: '',
        category: '',
        tour: '',
        product: '',
        transfer: '',
      });
      setSelectedProduct(null);
      setSearchTerm('');
    }
  };

  const isFormComplete = filters.location && filters.category && filters.tour && selectedProduct;

  return (
    <div className="space-y-6">
      {/* Location Selection */}
      <Select
        label="Destination"
        options={tourData.locations.map((loc) => ({ value: loc, label: loc }))}
        value={filters.location}
        onChange={handleLocationChange}
      />

      {/* Category Selection */}
      {filters.location && (
        <Select
          label="Category"
          options={categories.map((cat) => ({ value: cat, label: cat }))}
          value={filters.category}
          onChange={handleCategoryChange}
          disabled={!filters.location}
        />
      )}

      {/* Tour Selection */}
      {filters.category && (
        <Select
          label="Activity/Tour"
          options={tours.map((tour) => ({ value: tour, label: tour }))}
          value={filters.tour}
          onChange={handleTourChange}
          disabled={!filters.category}
        />
      )}

      {/* Product/Package Selection */}
      {filters.tour && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Package/Product
          </label>

          {/* Search box */}
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Product List */}
          <div className="border rounded-lg max-h-48 overflow-y-auto">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product, idx) => (
                <button
                  key={idx}
                  onClick={() => handleProductSelect(product)}
                  className={`
                    w-full text-left px-4 py-3 border-b hover:bg-blue-50 transition-colors
                    ${
                      selectedProduct?.product === product.product &&
                      selectedProduct?.transfer === product.transfer
                        ? 'bg-blue-100 border-l-4 border-l-blue-600'
                        : ''
                    }
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {product.product}
                      </p>
                      <p className="text-sm text-gray-600">{product.transfer}</p>
                    </div>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(product.costAED)} AED
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                No products available
              </div>
            )}
          </div>

          {/* Transfer Type Selection (if multiple transfers for same product) */}
          {selectedProduct && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Selected:
              </p>
              <p className="text-gray-900 font-semibold">
                {selectedProduct.product}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                {selectedProduct.transfer}
              </p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(selectedProduct.costAED)} AED
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Activity Button */}
      <Button
        onClick={handleAddActivity}
        disabled={!isFormComplete}
        icon={Plus}
        className="w-full"
      >
        Add Activity
      </Button>

      {/* Selected Activities List */}
      {selectedActivities.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Selected Activities ({selectedActivities.length})
          </h3>
          <div className="space-y-2">
            {selectedActivities.map((activity, idx) => (
              <div
                key={activity.id || idx}
                className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {activity.location} - {activity.tour}
                  </p>
                  <p className="text-sm text-gray-600">{activity.product}</p>
                  <p className="text-xs text-gray-500">{activity.transfer}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">
                    {formatCurrency(activity.costAED)} AED
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitySelector;
