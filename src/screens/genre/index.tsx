import React from 'react'
import { StyleSheet } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CloudOff } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/hooks/useTheme'
import { useAlbums } from '@/hooks/albums'
import NotFoundView from '@/components/NotFoundView'
import StatusBanner from '@/components/StatusBanner'
import GenreContent from './components/Content'
import LoadingGenreContent from './components/Content/Loading'
import { spacing } from '@/constants/design'

const GenreScreen: React.FC = () => {
  const route = useRoute<any>()
  const { genre } = route.params
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { albums, isLoading, degraded } = useAlbums()

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
    <SafeAreaView testID="genre-screen" edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      {degraded && (
        <StatusBanner
          icon={<CloudOff size={14} color={colors.subtext} />}
          text={t('common.serverUnreachableBanner')}
          closable
          style={styles.degradedBanner}
          testID="server-unreachable-banner"
        />
      )}
      <GenreContent genre={genre} albums={genreAlbums} />
    </SafeAreaView>
  )
}

export default GenreScreen

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  degradedBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
})
