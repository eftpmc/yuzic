import { StyleSheet } from 'react-native';
import { radius, spacing, typography } from '@/constants/design';

export const ESTIMATED_ROW_HEIGHT = 108;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    margin: spacing.lg,
    marginBottom: spacing.controlGap,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.tight,
  },
  summaryLabel: {
    ...typography.rowSubtitle,
  },
  summaryValue: {
    ...typography.caption,
    fontWeight: '600',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xxs,
  },
  providerHeaderText: {
    ...typography.navigationTitle,
    fontWeight: '700',
  },
  providerHeaderDelete: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.scrollClearance,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.scrollClearance,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.controlGap,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  coverCell: {
    width: 44,
    marginRight: spacing.md,
  },
  trackCell: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.button,
    flex: 1,
  },
  subtitle: {
    ...typography.caption,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    minWidth: 0,
  },
  metaDot: {
    ...typography.caption,
    marginHorizontal: spacing.tight,
  },
  downloadedDate: {
    flexShrink: 1,
  },
  sizeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  removeButtonDisabled: {
    opacity: 0.45,
  },
  emptyText: {
    ...typography.caption,
    paddingTop: spacing.roomy,
    textAlign: 'center',
  },
});
