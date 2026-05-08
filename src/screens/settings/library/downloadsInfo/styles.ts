import { StyleSheet } from 'react-native';

export const ESTIMATED_ROW_HEIGHT = 108;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  summaryCard: {
    margin: 16,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCardDark: {
    backgroundColor: '#111',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    color: '#000',
    fontSize: 14,
  },
  summaryLabelDark: {
    color: '#fff',
  },
  summaryValue: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValueDark: {
    color: '#aaa',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  providerHeaderDark: {
    backgroundColor: 'transparent',
  },
  providerHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  providerHeaderTextDark: {
    color: '#fff',
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
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
  },
  rowDark: {
    backgroundColor: '#111',
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
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
  },
  titleDark: {
    color: '#fff',
  },
  subtitle: {
    color: '#666',
    fontSize: 12,
  },
  subtitleDark: {
    color: '#aaa',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    minWidth: 0,
  },
  metaDot: {
    color: '#666',
    fontSize: 12,
    marginHorizontal: 5,
  },
  downloadedDate: {
    flexShrink: 1,
  },
  sizeText: {
    color: '#333',
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
  valueDark: {
    color: '#ddd',
  },
  emptyText: {
    paddingTop: 20,
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
  },
  emptyTextDark: {
    color: '#999',
  },
});
