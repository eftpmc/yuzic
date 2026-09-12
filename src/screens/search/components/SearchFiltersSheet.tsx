import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import {
  OptionSheetDivider,
  OptionSheetRow,
  OptionSheetSectionLabel,
  optionSheetStyles,
  useOptionSheetBackground,
} from '@/components/options/OptionSheetPrimitives';
import { getSourceMeta, type SourceId } from '@/features/sources/registry';
import { iconSize, spacing, typography } from '@/constants/design';
import type { SearchEntityType } from '@/contexts/SearchContext';

type Props = {
  /** Sources enabled for search at all — the sheet only ever offers these;
   *  a source turned off in Settings never appears here to be re-enabled
   *  per-search. */
  availableSourceIds: SourceId[];
  selectedSourceIds: string[];
  onToggleSource: (sourceId: SourceId) => void;
  selectedEntityTypes: SearchEntityType[];
  onToggleEntityType: (entityType: SearchEntityType) => void;
};

const ENTITY_TYPE_ORDER: SearchEntityType[] = ['album', 'artist'];

/**
 * The Filters sheet behind "Other sources" — picks which enabled search
 * sources and which entity types are included in the current external
 * search. Distinct from the Search settings screen: that decides which
 * sources are *available* for search at all; this decides which of those
 * are in play for *this* search.
 */
const SearchFiltersSheet = forwardRef<BottomSheetModal, Props>(
  ({ availableSourceIds, selectedSourceIds, onToggleSource, selectedEntityTypes, onToggleEntityType }, ref) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const sheetBg = useOptionSheetBackground();

    const entityTypeLabel = (entityType: SearchEntityType) => t(`search.entityTypes.${entityType}`);

    const snapPoints = useMemo(() => ['50%'], []);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={[optionSheetStyles.sheetBackground, sheetBg]}
      >
        <BottomSheetScrollView style={sheetBg} contentContainerStyle={optionSheetStyles.sheetContent}>
          <Text style={[styles.title, { color: colors.secondary }]}>
            {t('search.filters.title')}
          </Text>

          <OptionSheetSectionLabel label={t('search.filters.sources')} />
          {availableSourceIds.length === 0 && (
            <Text style={[styles.empty, { color: colors.subtext }]} testID="search-filters-no-sources">
              {t('search.filters.noSourcesEnabled')}
            </Text>
          )}
          {availableSourceIds.map(sourceId => {
            const meta = getSourceMeta(sourceId);
            const checked = selectedSourceIds.includes(sourceId);
            return (
              <OptionSheetRow
                key={sourceId}
                testID={`search-filters-source-${sourceId}`}
                label={meta?.label ?? sourceId}
                onPress={() => onToggleSource(sourceId)}
                trailing={checked ? <Check size={iconSize.secondary} color={colors.themeColor} /> : undefined}
              />
            );
          })}

          <OptionSheetDivider />

          <OptionSheetSectionLabel label={t('search.filters.entityTypes')} />
          {ENTITY_TYPE_ORDER.map(entityType => {
            const checked = selectedEntityTypes.includes(entityType);
            return (
              <OptionSheetRow
                key={entityType}
                testID={`search-filters-entity-${entityType}`}
                label={entityTypeLabel(entityType)}
                onPress={() => onToggleEntityType(entityType)}
                trailing={checked ? <Check size={iconSize.secondary} color={colors.themeColor} /> : undefined}
              />
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

SearchFiltersSheet.displayName = 'SearchFiltersSheet';

export default SearchFiltersSheet;

const styles = StyleSheet.create({
  title: {
    ...typography.rowTitle,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  empty: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
});
