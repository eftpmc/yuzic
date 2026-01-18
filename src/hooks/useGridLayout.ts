import { useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { selectGridColumns } from '@/utils/redux/selectors/settingsSelectors';

const GRID_HORIZONTAL_PADDING = 16;
const GRID_GAP = 12;

export function useGridLayout() {
  const { width } = useWindowDimensions();
  const gridColumns = useSelector(selectGridColumns);

  const totalGaps = GRID_GAP * (gridColumns - 1);
  const totalPadding = GRID_HORIZONTAL_PADDING * 2;

  const gridItemWidth =
    (width - totalPadding - totalGaps) / gridColumns;

  return {
    gridColumns,
    gridItemWidth,
    gridGap: GRID_GAP,
    gridPadding: GRID_HORIZONTAL_PADDING,
  };
}