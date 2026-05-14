import React, { forwardRef, useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet'
import { Dices } from 'lucide-react-native'
import { useTheme } from '@/hooks/useTheme'
import { renderBackdrop } from '@/components/BottomSheetBackdrop'

type Props = {
  items: string[]
  onSelect: (value: string) => void
  onRandomize: () => void
  placeholder?: string
}

const SelectionBottomSheet = forwardRef<BottomSheetModal, Props>(
  ({ items, onSelect, onRandomize, placeholder }, ref) => {
    const { isDarkMode } = useTheme()
    const [query, setQuery] = useState('')

    const snapPoints = useMemo(() => ['60%'], [])

    const filteredItems = useMemo(() => {
      const q = query.trim().toLowerCase()
      if (!q) return items
      return items.filter(item => item.toLowerCase().includes(q))
    }, [query, items])

    const handleDismiss = useCallback(() => {
      setQuery('')
    }, [])

    const handleSubmit = useCallback(() => {
      const trimmed = query.trim()
      if (trimmed) onSelect(trimmed)
    }, [query, onSelect])

    const renderItem = useCallback(({ item }: { item: string }) => (
      <TouchableOpacity
        style={[styles.item, isDarkMode && styles.itemDark]}
        onPress={() => onSelect(item)}
      >
        <Text style={[styles.itemText, isDarkMode && styles.itemTextDark]}>
          {item}
        </Text>
      </TouchableOpacity>
    ), [onSelect, isDarkMode])

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        onDismiss={handleDismiss}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDarkMode ? '#1c1c1c' : '#f9f9f9' }}
        handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#555' : '#ccc' }}
      >
        <View style={[styles.inputRow, isDarkMode && styles.inputRowDark]}>
          <BottomSheetTextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder ?? 'Search…'}
            placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <TouchableOpacity onPress={onRandomize} style={styles.shuffleButton} hitSlop={8}>
            <Dices size={18} color={isDarkMode ? '#888' : '#666'} />
          </TouchableOpacity>
        </View>

        <BottomSheetFlatList
          data={filteredItems}
          keyExtractor={item => item}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      </BottomSheetModal>
    )
  }
)

SelectionBottomSheet.displayName = 'SelectionBottomSheet'
export default SelectionBottomSheet

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#efefef',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inputRowDark: {
    backgroundColor: '#2a2a2a',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
  },
  inputDark: {
    color: '#fff',
  },
  shuffleButton: {
    paddingLeft: 10,
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  item: {
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  itemDark: {
    borderBottomColor: '#2e2e2e',
  },
  itemText: {
    fontSize: 15,
    color: '#111',
  },
  itemTextDark: {
    color: '#eee',
  },
})
