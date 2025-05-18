import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import styles from "./styles";

const categories = [
  { key: 'all', label: 'All' },
  { key: 'sour', label: 'Sour Candy' },
  { key: 'chewy', label: 'Chewy Candy' },
  { key: 'fruit', label: 'Fruit Candy' },
];

const priceRanges = [
  { key: 'all', label: 'All Prices' },
  { key: 'under5', label: 'Under $5' },
  { key: '5to10', label: '$5 - $10' },
  { key: '10to20', label: '$10 - $20' },
  { key: 'over20', label: 'Over $20' },
];

const Header = ({ search, setSearch, selectedCategory, setSelectedCategory }) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const handleApplyFilters = () => {
    // Here you would typically update the parent component's state with the filter values
    setShowFilterModal(false);
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Products</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.filterOptions}>
                {priceRanges.map(range => (
                  <TouchableOpacity
                    key={range.key}
                    style={[
                      styles.filterOption,
                      selectedPriceRange === range.key && styles.filterOptionActive
                    ]}
                    onPress={() => setSelectedPriceRange(range.key)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedPriceRange === range.key && styles.filterOptionTextActive
                    ]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    sortBy === 'newest' && styles.filterOptionActive
                  ]}
                  onPress={() => setSortBy('newest')}
                >
                  <Text style={[
                    styles.filterOptionText,
                    sortBy === 'newest' && styles.filterOptionTextActive
                  ]}>
                    Newest
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    sortBy === 'price_low' && styles.filterOptionActive
                  ]}
                  onPress={() => setSortBy('price_low')}
                >
                  <Text style={[
                    styles.filterOptionText,
                    sortBy === 'price_low' && styles.filterOptionTextActive
                  ]}>
                    Price: Low to High
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    sortBy === 'price_high' && styles.filterOptionActive
                  ]}
                  onPress={() => setSortBy('price_high')}
                >
                  <Text style={[
                    styles.filterOptionText,
                    sortBy === 'price_high' && styles.filterOptionTextActive
                  ]}>
                    Price: High to Low
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSelectedPriceRange('all');
                setSortBy('newest');
              }}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApplyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.headerWrapper}>
      <Text style={styles.headerTitle}>Discover</Text>
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#A0A0A0" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#A0A0A0"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter-outline" size={22} color="#222" />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryPill, selectedCategory === cat.key && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text style={selectedCategory === cat.key ? styles.categoryPillTextActive : styles.categoryPillText}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {renderFilterModal()}
    </View>
  );
};

export default Header; 