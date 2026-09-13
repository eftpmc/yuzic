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
import type { SearchResultScope } from '@/contexts/searchLegs';

type Props = {
  resultScope: SearchResultScope;
  onChangeScope: (scope: SearchResultScope) => void;
  /** Sources enabled for search at all — the sheet only ever offers these;
   *  a source turned off in Settings never appears here to be re-enabled
   *  per-search. */
  availableSourceIds: SourceId[];
  selectedSourceIds: string[];
  onToggleSource: (sourceId: SourceId) => void;
  selectedEntityTypes: SearchEntityType[];
  onToggleEntityType: (entityType: SearchEntityType) => void;
};

const SCOPE_ORDER: SearchResultScope[] = ['library', 'other'];
const ENTITY_TYPE_ORDER: SearchEntityType[] = ['album', 'artist'];

/**
 * The Search filter sheet. It owns the whole scope choice now — "Your Library"
 * vs "Other sources" is the first section here rather than a segmented control
 * on the screen, so the search field gets the full width and the one control
 * to its right holds every search decision. Picking "Other sources" reveals the
 * source and entity-type filters beneath; "Your Library" hides them because
 * they don't apply to a local search.
 *
 * Distinct from Settings › Search: that decides which sources are *available*
 * for search at all; this decides scope and which of those are in play for
 * *this* search.
 */
const SearchFiltersSheet = forwardRef<BottomSheetModal, Props>(
  ({ resultScope, onChangeScope, availableSourceIds, selectedSourceIds, onToggleSource, selectedEntityTypes, onToggleEntityType }, ref) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const sheetBg = useOptionSheetBackground();

    const entityTypeLabel = (entityType: SearchEntityType) => t(`search.entityTypes.${entityType}`);

    const snapPoints = useMemo(() => ['50%'], []);
    const isOther = resultScope === 'other';

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

          <OptionSheetSectionLabel label={t('search.filters.scope')} />
          {SCOPE_ORDER.map(scope => {
            const checked = resultScope === scope;
            return (
              <OptionSheetRow
                key={scope}
                testID={`search-filters-scope-${scope}`}
                label={t(`search.scope.${scope}`)}
                onPress={() => onChangeScope(scope)}
                trailing={checked ? <Check size={iconSize.secondary} color={colors.themeColor} /> : undefined}
              />
            );
          })}

          {isOther && (
            <>
              <OptionSheetDivider />

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
            </>
          )}
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
