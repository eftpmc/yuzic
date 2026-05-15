import { StyleSheet } from 'react-native';

export const ESTIMATED_ROW_HEIGHT = 108;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    marginBottom: 10,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  providerHeaderText: {
    fontSize: 18,
    fontWeight: '700',
  },
  providerHeaderDelete: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coverCell: {
    width: 44,
    marginRight: 12,
  },
  trackCell: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    minWidth: 0,
  },
  metaDot: {
    fontSize: 12,
    marginHorizontal: 5,
  },
  downloadedDate: {
    flexShrink: 1,
  },
  sizeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  removeButtonDisabled: {
    opacity: 0.45,
  },
  emptyText: {
    paddingTop: 20,
    textAlign: 'center',
    fontSize: 13,
  },
});
