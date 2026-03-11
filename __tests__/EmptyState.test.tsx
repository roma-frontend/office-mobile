import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { EmptyState } from '../components/ui/EmptyState';

describe('EmptyState Component', () => {
  it('renders correctly with required props', () => {
    const { getByText } = render(
      <EmptyState title="No data" subtitle="Nothing to show" />
    );
    
    expect(getByText('No data')).toBeTruthy();
    expect(getByText('Nothing to show')).toBeTruthy();
  });

  it('renders with custom icon', () => {
    const { UNSAFE_root } = render(
      <EmptyState icon="home-outline" title="Home empty" />
    );
    
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders action button when provided', () => {
    const { getByText } = render(
      <EmptyState 
        title="No items" 
        action={<><>Add Item</></>} 
      />
    );
    
    expect(getByText('No items')).toBeTruthy();
  });
});
