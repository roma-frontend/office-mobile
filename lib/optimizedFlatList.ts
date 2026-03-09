/**
 * Performance-optimized FlatList utilities for React Native
 * 
 * Usage:
 * import { OptimizedFlatList, createMemoizedItem } from '@/lib/optimizedFlatList';
 */

import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';

/**
 * Optimized FlatList with best practices
 * - Uses FlashList for better performance (5x faster)
 * - Proper keyExtractor
 * - removeClippedSubviews for Android
 * - maxToRenderPerBatch optimization
 * - windowSize control
 */

interface OptimizedFlatListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  numColumns?: number;
  contentContainerStyle?: any;
  itemHeight?: number;
  estimatedItemSize?: number;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  ListEmptyComponent?: React.ComponentType<any> | null;
  ListHeaderComponent?: React.ComponentType<any> | null;
  ListFooterComponent?: React.ComponentType<any> | null;
  ItemSeparatorComponent?: React.ComponentType<any> | null;
}

export function OptimizedFlatList<T extends any>({
  data,
  renderItem,
  keyExtractor,
  numColumns = 1,
  contentContainerStyle,
  itemHeight,
  estimatedItemSize = 100,
  onEndReached,
  onEndReachedThreshold = 0.5,
  refreshing,
  onRefresh,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
  ItemSeparatorComponent,
}: OptimizedFlatListProps<T>) {
  // Memoized render function
  const _renderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => renderItem(item, index),
    [renderItem]
  );

  return (
    <FlashList
      data={data}
      renderItem={_renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      contentContainerStyle={contentContainerStyle}
      estimatedItemSize={estimatedItemSize || itemHeight || 100}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ItemSeparatorComponent={ItemSeparatorComponent}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      updateCellsBatchingPeriod={100}
      initialNumToRender={10}
      // Disable unnecessary features
      disableVirtualization={false}
      showsVerticalScrollIndicator={true}
      showsHorizontalScrollIndicator={false}
      // Memory optimization
      recycleItems={true}
    />
  );
}

/**
 * Create memoized list item component
 * Prevents unnecessary re-renders
 */
export function createMemoizedItem<T>(
  ItemComponent: React.ComponentType<{ item: T; index: number } & any>,
  propsAreEqual?: (prevProps: any, nextProps: any) => boolean
) {
  return memo(ItemComponent, propsAreEqual || ((prev, next) => {
    // Default shallow comparison
    return prev.item === next.item && prev.index === next.index;
  }));
}

/**
 * Default item separator
 */
export function DefaultItemSeparator({ height = 1 }: { height?: number }) {
  return <View style={{ height }} />;
}

/**
 * Default empty state
 */
export function DefaultEmptyState({
  message = 'No items found',
  icon,
}: { message?: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.emptyState}>
      {icon || <View style={styles.emptyIcon} />}
      <View style={styles.emptyText}>{message}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(100, 100, 100, 0.2)',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

/**
 * Hook for pagination
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = 20
) {
  const [page, setPage] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const paginatedItems = useMemo(() => {
    return items.slice(0, (page + 1) * pageSize);
  }, [items, page, pageSize]);

  const loadMore = useCallback(() => {
    if (loading) return;
    if (paginatedItems.length >= items.length) return;
    
    setLoading(true);
    setTimeout(() => {
      setPage(p => p + 1);
      setLoading(false);
    }, 100);
  }, [loading, paginatedItems.length, items.length]);

  const refresh = useCallback(() => {
    setPage(0);
  }, []);

  return {
    items: paginatedItems,
    loading,
    hasMore: paginatedItems.length < items.length,
    loadMore,
    refresh,
  };
}
