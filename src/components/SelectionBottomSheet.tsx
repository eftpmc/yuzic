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
    const { colors } = useTheme()
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
        style={[styles.item, { borderBottomColor: colors.muted }]}
        onPress={() => onSelect(item)}
      >
        <Text style={[styles.itemText, { color: colors.secondary }]}>
          {item}
        </Text>
      </TouchableOpacity>
    ), [onSelect, colors])

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        onDismiss={handleDismiss}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <View style={[styles.inputRow, { backgroundColor: colors.muted }]}>
          <BottomSheetTextInput
            style={[styles.input, { color: colors.secondary }]}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder ?? 'Search…'}
            placeholderTextColor={colors.placeholder}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <TouchableOpacity onPress={onRandomize} style={styles.shuffleButton} hitSlop={8}>
            <Dices size={18} color={colors.subtext} />
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
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
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
  },
  itemText: {
    fontSize: 15,
  },
})
