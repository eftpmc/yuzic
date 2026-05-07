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
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  tableHeaderDark: {
    backgroundColor: '#1C1C1E',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  providerHeaderDark: {
    backgroundColor: '#1C1C1E',
  },
  providerHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  providerHeaderTextDark: {
    color: '#d1d5db',
  },
  providerHeaderDelete: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerItem: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
  },
  headerTrack: {
    flex: 1.9,
  },
  headerBytes: {
    width: 78,
    textAlign: 'right',
  },
  headerAction: {
    width: 34,
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
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 10,
    gap: 6,
  },
  rowDark: {
    backgroundColor: '#111',
    borderColor: '#2C2C2E',
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coverCell: {
    width: 44,
  },
  trackCell: {
    flex: 1.9,
    paddingRight: 4,
  },
  title: {
    color: '#111',
    fontSize: 14,
    fontWeight: '600',
  },
  titleDark: {
    color: '#fff',
  },
  subtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  subtitleDark: {
    color: '#aaa',
  },
  bytesCell: {
    width: 78,
    color: '#333',
    fontSize: 12,
    textAlign: 'right',
  },
  removeButton: {
    width: 34,
    height: 26,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  removeButtonDisabled: {
    opacity: 0.45,
  },
  valueDark: {
    color: '#ddd',
  },
  separator: {
    height: 8,
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

