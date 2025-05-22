import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  StyleSheet,
  FlatList,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { styles as baseStyles } from './styles';

export function PreStreamForm({
  thumbnailLocalUri,
  streamTitle,
  isLoading,
  setStreamTitle,
  pickThumbnail,
  startLiveStream,
  scheduledStreams,
  showDropdown,
  setShowDropdown,
  selectScheduledStream,
  products,
  selectedProducts,
  useAllInventory,
  toggleProductSelection,
  toggleUseAllInventory,
  setSelectedProducts,  
  gamifiedDiscount, 
  setGamifiedDiscount,
}) {
  const renderDropdownItem = ({ item }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => selectScheduledStream(item)}
    >
      <Text style={styles.dropdownItemText}>{item.title}</Text>
      <Text style={styles.dropdownItemDate}>
        {new Date(item.date?.toDate()).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item, drag, isActive }) => {
    const isSelected = selectedProducts.includes(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.productItem,
          isSelected && styles.selectedProductItem,
          isActive && styles.draggingItem
        ]}
        onPress={() => toggleProductSelection(item.id)}
        onLongPress={drag}
        disabled={useAllInventory}
      >
        <View style={styles.dragHandle}>
          <MaterialIcons name="drag-handle" size={24} color="#666" />
        </View>
        {item.images?.[0] ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <MaterialIcons name="image" size={24} color="#666" />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>
            ${item.bulkPrice || item.fullPrice}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkmarkContainer}>
            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Sort products based on selectedProducts order
  const sortedProducts = React.useMemo(() => {
    if (!products || !selectedProducts) return products;
    
    // Create a map of product IDs to their order
    const orderMap = new Map(selectedProducts.map((id, index) => [id, index]));
    
    // Sort products based on their order in selectedProducts
    return [...products].sort((a, b) => {
      const aOrder = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  }, [products, selectedProducts]);

  const handleDragEnd = ({ data }) => {
    const reorderedProducts = data
      .filter(item => selectedProducts.includes(item.id))
      .map(item => item.id);
    setSelectedProducts(reorderedProducts);
  };

  const renderHeader = () => (
    <>
      <View style={styles.titleContainer}>
        <TextInput
          style={[baseStyles.input, styles.titleInput]}
          value={streamTitle}
          onChangeText={text =>
            setStreamTitle(
              text
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            )
          }
          placeholder="Enter stream title"
          placeholderTextColor="#999"
        />
        {scheduledStreams.length > 0 && (
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowDropdown(true)}
          >
            <MaterialIcons name="event" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.thumbnailWrapper}>
        <TouchableOpacity
          style={[
            baseStyles.thumbnailContainer,
            !thumbnailLocalUri && baseStyles.thumbnailPlaceholder,
            styles.centeredThumbnail
          ]}
          onPress={pickThumbnail}
          disabled={isLoading}
        >
          {thumbnailLocalUri ? (
            <Image 
              source={{ uri: thumbnailLocalUri }} 
              style={[baseStyles.thumbnail, styles.centeredThumbnailImage]} 
              resizeMode="cover"
            />
          ) : (
            <View style={[baseStyles.uploadPrompt, styles.centeredUploadPrompt]}>
              <MaterialIcons name="add-photo-alternate" size={40} color="#666" />
              <Text style={baseStyles.uploadText}>Upload Thumbnail</Text>
              <Text style={baseStyles.uploadSubtext}>Tap to choose an image</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text style={baseStyles.sectionTitle}>Product Queue</Text>

<View style={styles.productQueueContainer}>
  {/* Existing toggle — keep this */}
  <TouchableOpacity
    style={styles.inventoryToggle}
    onPress={toggleUseAllInventory}
  >
    <MaterialIcons
      name={useAllInventory ? "check-box" : "check-box-outline-blank"}
      size={24}
      color="#666"
    />
    <Text style={styles.inventoryToggleText}>Use All Inventory</Text>
        </TouchableOpacity>

        {/* 🔥 New toggle — insert this below */}
        <TouchableOpacity
          style={styles.inventoryToggle}
          onPress={() => setGamifiedDiscount(!gamifiedDiscount)}
        >
          <MaterialIcons
            name={gamifiedDiscount ? "check-box" : "check-box-outline-blank"}
            size={24}
            color="#666"
          />
          <Text style={styles.inventoryToggleText}>Enable Gamified Discount Streak</Text>
        </TouchableOpacity>
      </View>

    </>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[baseStyles.container, { flex: 1 }]}>
        <ScrollView style={{ flex: 1 }}>
          {renderHeader()}
          {!useAllInventory ? (
            <DraggableFlatList
              data={sortedProducts}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data }) => {
                // Update the order of selected products
                const reorderedProducts = data
                  .filter(item => selectedProducts.includes(item.id))
                  .map(item => item.id);
                setSelectedProducts(reorderedProducts);
              }}
              renderItem={({ item, drag, isActive }) => renderProductItem({ item, drag, isActive })}
              contentContainerStyle={styles.productList}
            />
          ) : null}
        </ScrollView>

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[
              baseStyles.startButton,
              (isLoading || !thumbnailLocalUri) && baseStyles.startButtonDisabled,
            ]}
            onPress={startLiveStream}
            disabled={isLoading || !thumbnailLocalUri}
          >
            {isLoading ? (
              <View style={baseStyles.loadingContainer}>
                <ActivityIndicator color="#fff" />
                <Text style={baseStyles.loadingText}>Preparing Stream...</Text>
              </View>
            ) : (
              <>
                <MaterialIcons name="live-tv" size={24} color="#fff" />
                <Text style={baseStyles.startButtonText}>Go Live</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={showDropdown}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDropdown(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.dropdownContainer}>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownTitle}>Select Scheduled Stream</Text>
                  <TouchableOpacity onPress={() => setShowDropdown(false)}>
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={scheduledStreams}
                  renderItem={renderDropdownItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.dropdownList}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleInput: {
    flex: 1,
    marginBottom: 0,
  },
  dropdownButton: {
    padding: 10,
    marginLeft: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  dropdownList: {
    padding: 10,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  dropdownItemDate: {
    fontSize: 14,
    color: '#666',
  },
  productQueueContainer: {
    marginBottom: 20,
  },
  inventoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 10,
  },
  inventoryToggleText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#2c3e50',
  },
  productList: {
    padding: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  draggingItem: {
    backgroundColor: '#f8f8f8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dragHandle: {
    padding: 5,
    marginRight: 5,
  },
  selectedProductItem: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8e9',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 10,
  },
  productTitle: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  checkmarkContainer: {
    marginLeft: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  thumbnailWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  centeredThumbnail: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    aspectRatio: 16/9,
  },
  centeredThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  centeredUploadPrompt: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButtonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});