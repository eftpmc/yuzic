import { useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { selectGridColumns, selectGridSpacing } from '@/utils/redux/selectors/settingsSelectors';

const GRID_HORIZONTAL_PADDING = 8;

export function useGridLayout() {
  const { width } = useWindowDimensions();
  const gridColumns = useSelector(selectGridColumns);
  const gridSpacing = useSelector(selectGridSpacing);

  const totalPadding = GRID_HORIZONTAL_PADDING * 2;
  const totalItemMargins = gridColumns * (gridSpacing * 2);
  // FlashList numColumns divides row into equal cells - no built-in gap between columns
  const gridItemWidth =
    (width - totalPadding - totalItemMargins) / gridColumns;

  return {
    gridColumns,
    gridItemWidth,
    gridSpacing,
    gridGap: gridSpacing,
    gridPadding: GRID_HORIZONTAL_PADDING,
  };
}