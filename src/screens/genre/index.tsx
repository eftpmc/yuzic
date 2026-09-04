import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { CloudOff } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/hooks/useTheme'
import { useAlbums } from '@/hooks/albums'
import NotFoundView from '@/components/NotFoundView'
import StatusBanner from '@/components/StatusBanner'
import GenreContent from './components/Content'
import LoadingGenreContent from './components/Content/Loading'
import { DETAIL_BAR_HEIGHT } from '@/components/DetailHeader'
import { spacing } from '@/constants/design'

const GenreScreen: React.FC = () => {
  const route = useRoute<any>()
  const { genre } = route.params
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { albums, isLoading, degraded } = useAlbums()
  const insets = useSafeAreaInsets()

  const genreAlbums = albums.filter((a) => a.genres.includes(genre))

  if (!genre) {
    return <NotFoundView message="Genre not found" />
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
        <LoadingGenreContent />
      </SafeAreaView>
    )
  }

  return (
    <View testID="genre-screen" style={[styles.screen, { backgroundColor: colors.background }]}>
      {degraded && (
        <View
          pointerEvents="box-none"
          style={[styles.degradedBanner, { top: insets.top + DETAIL_BAR_HEIGHT }]}
        >
          <StatusBanner
            icon={<CloudOff size={14} color={colors.subtext} />}
            text={t('common.serverUnreachableBanner')}
            closable
            testID="server-unreachable-banner"
          />
        </View>
      )}
      <GenreContent genre={genre} albums={genreAlbums} />
    </View>
  )
}

export default GenreScreen

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // Under the floating bar rather than above the content: the art runs to the
  // top of the screen now, and there is nowhere above it left to push.
  degradedBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
})
